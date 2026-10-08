import {
  AGENT_MAX_EVENT_BYTES,
  AGENT_MAX_REQUEST_BYTES,
  AGENT_TOOL_NAMES,
  agentTurnSchema,
  agentResolvedModelSchema,
  hashAgentSnapshot,
  maskAgentWorkflow,
  encodeAgentEvent,
  parseAgentEvent,
  type AgentEvent,
} from '@ai-workflow/agent-protocol'
import {
  BadRequestException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { randomUUID } from 'node:crypto'
import type { Response } from 'express'
import { ChatModelResolverService } from '@/services/chat-model-resolver.service'
import { AgentContextService } from '@/services/agent-context.service'
import { WorkflowDraftService } from '@/services/workflow-draft.service'

@Injectable()
export class AgentRunService {
  private readonly logger = new Logger(AgentRunService.name)
  private readonly active = new Map<
    string,
    { ownerId: string; appId: string; controller: AbortController; sessionId?: string }
  >()
  constructor(
    private readonly config: ConfigService,
    private readonly models: ChatModelResolverService,
    private readonly contexts: AgentContextService,
    private readonly drafts: WorkflowDraftService,
  ) {}
  private connection() {
    const url = this.config.get<string>('AGENT_RUNTIME_URL'),
      token = this.config.get<string>('AGENT_RUNTIME_INTERNAL_AUTH_TOKEN')
    if (!url || !token) throw new ServiceUnavailableException('Agent Runtime 尚未配置')
    return { url: url.replace(/\/+$/, ''), token }
  }
  async abort(ownerId: string, appId: string, sessionId: string) {
    await this.drafts.get(ownerId, appId)
    const { url, token } = this.connection(),
      response = await fetch(`${url}/internal/sessions/${sessionId}/abort`, {
        method: 'POST',
        signal: AbortSignal.timeout(5000),
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ ownerId, appId }),
      })
    if (!response.ok) throw new ServiceUnavailableException('停止 Agent 失败，请重试')
    return { stopped: true }
  }
  async stream(ownerId: string, appId: string, raw: unknown, response: Response) {
    const { url, token } = this.connection()
    if (Buffer.byteLength(JSON.stringify(raw)) > AGENT_MAX_REQUEST_BYTES)
      throw new BadRequestException('Agent 请求超过大小限制')
    const parsed = agentTurnSchema.safeParse(raw)
    if (!parsed.success) throw new BadRequestException('Agent 请求格式无效')
    const turn = parsed.data,
      draft = await this.drafts.get(ownerId, appId)
    if (turn.snapshot.workflow.id !== draft.definition.id)
      throw new BadRequestException('工作流不属于当前应用')
    // 摘要检查使用用户原始快照；随后在传入 Runtime 前统一掩码 Secret。
    if ((await hashAgentSnapshot(turn.snapshot)) !== turn.baseSnapshotHash)
      throw new BadRequestException('画布摘要与快照不一致')
    turn.snapshot.workflow = maskAgentWorkflow(turn.snapshot.workflow)
    const resolvedModel = agentResolvedModelSchema.parse(
        await this.models.resolve(ownerId, turn.model),
      ),
      controller = new AbortController(),
      agentRunId = randomUUID()
    if (
      [...this.active.values()].some((run) => run.ownerId === ownerId || run.appId === appId) ||
      this.active.size >= 8
    ) {
      response.setHeader('Content-Type', 'text/event-stream')
      response.end(
        encodeAgentEvent({
          type: 'agent_failed',
          error: {
            code: 'AGENT_RATE_LIMITED',
            message: '请求过于频繁，请稍后重试',
            retryable: true,
          },
        }),
      )
      return
    }
    const active = { ownerId, appId, controller, sessionId: turn.sessionId }
    this.active.set(agentRunId, active)
    const agentContextToken = this.contexts.issue({
        protocolVersion: 1,
        ownerId,
        appId,
        agentRunId,
        workflowId: draft.definition.id,
        allowedTools: [...AGENT_TOOL_NAMES],
        expiresAt: Date.now() + this.config.get<number>('AGENT_RUN_TIMEOUT_MS', 180_000) + 10_000,
      }),
      timeout = setTimeout(
        () => controller.abort('timeout'),
        this.config.get<number>('AGENT_RUN_TIMEOUT_MS', 180_000) + 15_000,
      ),
      disconnect = () => {
        if (!response.writableEnded) controller.abort('disconnect')
      }
    response.on('close', disconnect)
    response.setHeader('Content-Type', 'text/event-stream')
    response.setHeader('Cache-Control', 'no-store')
    response.setHeader('X-Accel-Buffering', 'no')
    response.flushHeaders()
    const heartbeat = setInterval(() => {
      if (!response.destroyed) response.write(': heartbeat\n\n')
    }, 15_000)
    let terminal = false,
      received = 0
    const send = (event: AgentEvent) => {
      if (terminal) return
      if (event.type === 'session_started') active.sessionId = event.sessionId
      if (event.type === 'candidate_ready') {
        if (
          event.baseSnapshotHash !== turn.baseSnapshotHash ||
          event.workflow.id !== turn.snapshot.workflow.id
        )
          throw new Error('候选上下文无效')
        this.contexts.assertCandidateValidated(agentRunId, event.workflow)
        event.workflow = maskAgentWorkflow(event.workflow)
      }
      terminal = ['agent_finished', 'agent_cancelled', 'agent_failed'].includes(event.type)
      if (!response.destroyed) response.write(encodeAgentEvent(event))
    }
    try {
      const upstream = await fetch(`${url}/internal/runs`, {
        method: 'POST',
        signal: controller.signal,
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          Accept: 'text/event-stream',
        },
        body: JSON.stringify({
          protocolVersion: 1,
          agentRunId,
          ownerId,
          appId,
          agentContextToken,
          turn,
          resolvedModel,
        }),
      })
      resolvedModel.apiKey = undefined
      if (
        !upstream.ok ||
        !upstream.headers.get('content-type')?.includes('text/event-stream') ||
        !upstream.body
      )
        throw new Error('Runtime 连接失败')
      const reader = upstream.body.getReader(),
        decoder = new TextDecoder()
      let buffer = ''
      try {
        while (true) {
          if (terminal) break
          const { value, done } = await reader.read()
          if (done) break
          received += value.byteLength
          if (received > 4_194_304) throw new Error('事件流超过大小限制')
          buffer += decoder.decode(value, { stream: true })
          if (Buffer.byteLength(buffer) > AGENT_MAX_EVENT_BYTES) throw new Error('事件超过大小限制')
          let boundary = /\r?\n\r?\n/.exec(buffer)
          while (boundary) {
            const frame = buffer.slice(0, boundary.index)
            buffer = buffer.slice(boundary.index + boundary[0].length)
            const data = frame
              .split(/\r?\n/)
              .filter((line) => line.startsWith('data:'))
              .map((line) => line.slice(5).trimStart())
              .join('\n')
            if (data) send(parseAgentEvent(JSON.parse(data)))
            boundary = /\r?\n\r?\n/.exec(buffer)
          }
        }
      } finally {
        await reader.cancel().catch(() => undefined)
      }
      if (!terminal)
        send({
          type: 'agent_failed',
          error: {
            code: 'AGENT_STREAM_INTERRUPTED',
            message: '连接已中断，本轮未完成',
            retryable: true,
          },
        })
    } catch {
      if (!response.destroyed)
        send({
          type: 'agent_failed',
          error: {
            code:
              controller.signal.reason === 'timeout' ? 'AGENT_TIMEOUT' : 'AGENT_STREAM_INTERRUPTED',
            message:
              controller.signal.reason === 'timeout'
                ? 'Agent 运行超时，已保留当前执行记录'
                : '连接已中断，本轮未完成',
            retryable: true,
          },
        })
    } finally {
      controller.abort()
      resolvedModel.apiKey = undefined
      clearTimeout(timeout)
      clearInterval(heartbeat)
      response.off('close', disconnect)
      this.active.delete(agentRunId)
      this.contexts.release(agentRunId)
      if (!response.destroyed) response.end()
      this.logger.log(JSON.stringify({ agentRunId, terminal }))
    }
  }
}
