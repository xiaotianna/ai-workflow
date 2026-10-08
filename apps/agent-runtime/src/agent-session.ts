import {
  AGENT_MAX_REQUEST_BYTES,
  agentContextClaimsSchema,
  type AgentRunRequest,
  type AgentEvent,
  type AgentError,
} from '@ai-workflow/agent-protocol'
import type { Agent } from '@earendil-works/pi-agent-core'
import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto'
import type { RuntimeConfig } from './config.js'
import { createAgent, runAgent } from './agent-runtime.js'
import { createPiModel } from './pi-model.js'
import { createServerClient } from './server-client.js'
import { createTools } from './tools/index.js'
import type { ToolContext } from './tool-context.js'

class RunError extends Error {
  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message)
    this.name = 'RunError'
  }
}
interface Session {
  id: string
  ownerId: string
  appId: string
  agent: Agent
  busy: boolean
  lastUsed: number
  controller?: AbortController
}

export class AgentSessions {
  private readonly sessions = new Map<string, Session>()
  private readonly timer: ReturnType<typeof setInterval>
  constructor(private readonly config: RuntimeConfig) {
    this.timer = setInterval(
      () => this.collect(),
      Math.min(config.AGENT_SESSION_IDLE_TTL_MS, 60_000),
    )
    this.timer.unref()
  }
  private collect() {
    for (const [id, session] of this.sessions) {
      if (!session.busy && Date.now() - session.lastUsed >= this.config.AGENT_SESSION_IDLE_TTL_MS) {
        session.agent.reset()
        session.agent.state.tools = []
        this.sessions.delete(id)
      }
    }
  }
  abort(id: string, ownerId: string, appId: string, reason = 'user') {
    const session = this.sessions.get(id)
    if (!session || session.ownerId !== ownerId || session.appId !== appId)
      throw new RunError('SESSION_NOT_FOUND', 'Agent 会话已失效')
    session.controller?.abort(reason)
  }
  close() {
    clearInterval(this.timer)
    for (const session of this.sessions.values()) {
      session.controller?.abort('shutdown')
      session.agent.abort()
    }
    this.sessions.clear()
  }
  async run(
    request: AgentRunRequest,
    disconnectSignal: AbortSignal,
    emit: (event: AgentEvent) => void,
  ) {
    const [payload, signature, extra] = request.agentContextToken.split('.'),
      expected = createHmac('sha256', this.config.AGENT_RUNTIME_INTERNAL_AUTH_TOKEN)
        .update(`agent-context:v1:${payload}`)
        .digest('base64url'),
      actual = Buffer.from(signature ?? '')
    if (
      !payload ||
      extra ||
      actual.length !== expected.length ||
      !timingSafeEqual(actual, Buffer.from(expected))
    )
      throw new RunError('AGENT_CONTEXT_INVALID', '本轮上下文无效')
    const claims = agentContextClaimsSchema.parse(
      JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')),
    )
    if (
      claims.ownerId !== request.ownerId ||
      claims.appId !== request.appId ||
      claims.agentRunId !== request.agentRunId ||
      claims.workflowId !== request.turn.snapshot.workflow.id ||
      claims.expiresAt <= Date.now()
    )
      throw new RunError('AGENT_CONTEXT_INVALID', '本轮上下文无效或已过期')
    this.collect()
    let session = request.turn.sessionId ? this.sessions.get(request.turn.sessionId) : undefined
    if (
      request.turn.sessionId &&
      (!session || session.ownerId !== request.ownerId || session.appId !== request.appId)
    )
      throw new RunError('SESSION_NOT_FOUND', 'Agent 会话已失效')
    const active = [...this.sessions.values()].filter((s) => s.busy)
    if (
      session?.busy ||
      active.some((s) => s.ownerId === request.ownerId || s.appId === request.appId) ||
      active.length >= this.config.AGENT_MAX_CONCURRENT_RUNS
    )
      throw new RunError('AGENT_RATE_LIMITED', '请求过于频繁，请稍后重试')
    if (!session) {
      if (this.sessions.size >= this.config.AGENT_MAX_SESSIONS)
        throw new RunError('AGENT_RATE_LIMITED', '会话数量已达上限，请稍后重试')
      session = {
        id: randomUUID(),
        ownerId: request.ownerId,
        appId: request.appId,
        agent: createAgent(request.resolvedModel, []),
        busy: false,
        lastUsed: Date.now(),
      }
      this.sessions.set(session.id, session)
    }
    const controller = new AbortController(),
      signal = AbortSignal.any([disconnectSignal, controller.signal])
    session.busy = true
    session.controller = controller
    const context: ToolContext = {
        baselineSnapshot: structuredClone(request.turn.snapshot),
        workingCandidate: structuredClone(request.turn.snapshot.workflow),
        candidateChanged: false,
        baseSnapshotHash: request.turn.baseSnapshotHash,
        server: createServerClient(
          this.config.AI_WORKFLOW_SERVER_URL,
          this.config.AGENT_RUNTIME_INTERNAL_AUTH_TOKEN,
          request.agentContextToken,
        ),
        emit,
      },
      pi = createPiModel(request.resolvedModel)
    session.agent.state.model = pi.model
    session.agent.streamFunction = pi.streamFn
    session.agent.state.tools = createTools(context)
    const timeout = setTimeout(() => controller.abort('timeout'), this.config.AGENT_RUN_TIMEOUT_MS),
      previousMessageCount = session.agent.state.messages.length
    emit({ type: 'session_started', sessionId: session.id, agentRunId: request.agentRunId })
    try {
      let runError: AgentError | undefined
      try {
        runError = await runAgent({
          agent: session.agent,
          prompt: `${request.turn.prompt}\n\n本轮节点上下文 ID：${JSON.stringify(request.turn.contextNodeIds)}。每轮画布基线已更新，请通过 read_canvas 获取最新状态。`,
          images: request.turn.images,
          signal,
          maxModelTurns: this.config.AGENT_MAX_MODEL_TURNS,
          maxToolCalls: this.config.AGENT_MAX_TOOL_CALLS,
          emit,
          allowedTools: claims.allowedTools,
          expiresAt: claims.expiresAt,
          audit: (record) =>
            process.stdout.write(
              `${JSON.stringify({ agentRunId: request.agentRunId, ...record })}\n`,
            ),
        })
      } catch (error) {
        if (!signal.aborted) throw error
      }
      if (signal.aborted) {
        if (signal.reason === 'timeout')
          emit({
            type: 'agent_failed',
            error: {
              code: 'AGENT_TIMEOUT',
              message: 'Agent 运行超时，已保留当前执行记录',
              retryable: true,
            },
          })
        else
          emit({
            type: 'agent_cancelled',
            agentRunId: request.agentRunId,
            cancelledAt: new Date().toISOString(),
            reason:
              signal.reason === 'shutdown'
                ? 'shutdown'
                : signal.reason === 'disconnect'
                  ? 'disconnect'
                  : 'user',
          })
      } else if (runError) emit({ type: 'agent_failed', error: runError })
      else {
        const messages = session.agent.state.messages
            .slice(previousMessageCount)
            .filter((m) => m.role === 'assistant'),
          last = messages.at(-1)
        emit({
          type: 'agent_finished',
          message:
            last?.role === 'assistant'
              ? last.content
                  .filter((p) => p.type === 'text')
                  .map((p) => p.text)
                  .join('')
                  .slice(0, 64_000)
              : '',
          usage: {
            inputTokens: messages.reduce(
              (n, m) => n + (m.role === 'assistant' ? m.usage.input : 0),
              0,
            ),
            outputTokens: messages.reduce(
              (n, m) => n + (m.role === 'assistant' ? m.usage.output : 0),
              0,
            ),
          },
        })
      }
    } finally {
      clearTimeout(timeout)
      session.busy = false
      session.lastUsed = Date.now()
      session.controller = undefined
      session.agent.state.tools = []
      session.agent.streamFunction = async () => {
        throw new Error('会话没有活跃模型配置')
      }
      session.agent.getApiKey = undefined
      request.resolvedModel.apiKey = undefined
      request.agentContextToken = ''
      // ponytail: 会话总量沿用单次请求预算；长期多图对话再引入历史裁剪。
      if (
        Buffer.byteLength(JSON.stringify(session.agent.state.messages)) > AGENT_MAX_REQUEST_BYTES
      ) {
        session.agent.reset()
        this.sessions.delete(session.id)
      }
    }
  }
}

export function safeRuntimeError(error: unknown): AgentError {
  return error instanceof RunError
    ? { code: error.code, message: error.message, retryable: true }
    : { code: 'AGENT_INTERNAL_ERROR', message: 'Agent 执行失败，请重试', retryable: true }
}
