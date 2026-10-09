import {
  agentContextClaimsSchema,
  type AgentRunRequest,
  type AgentEvent,
  type AgentError,
} from '@ai-workflow/agent-protocol'
import type { Agent } from '@earendil-works/pi-agent-core'
import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto'
import type { RuntimeConfig } from './config.js'
import { createAgent, runAgent } from './agent-runtime.js'
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
  controller: AbortController
}

export class AgentSessions {
  private readonly sessions = new Map<string, Session>()
  constructor(private readonly config: RuntimeConfig) {}
  abort(id: string, ownerId: string, appId: string, reason = 'user') {
    const session = this.sessions.get(id)
    if (!session) return
    if (session.ownerId !== ownerId || session.appId !== appId)
      throw new RunError('AGENT_SESSION_FORBIDDEN', '无法停止其他用户或应用的运行')
    session.controller.abort(reason)
  }
  close() {
    for (const session of this.sessions.values()) {
      session.controller.abort('shutdown')
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
    const active = [...this.sessions.values()]
    if (
      (request.turn.sessionId && this.sessions.has(request.turn.sessionId)) ||
      active.some((s) => s.ownerId === request.ownerId || s.appId === request.appId) ||
      active.length >= this.config.AGENT_MAX_CONCURRENT_RUNS
    )
      throw new RunError('AGENT_RATE_LIMITED', '请求过于频繁，请稍后重试')
    const controller = new AbortController(),
      signal = AbortSignal.any([disconnectSignal, controller.signal]),
      session: Session = {
        id: request.turn.sessionId ?? randomUUID(),
        ownerId: request.ownerId,
        appId: request.appId,
        agent: createAgent(request.resolvedModel, [], request.turn.messages),
        controller,
      },
      context: ToolContext = {
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
      }
    session.agent.state.tools = createTools(context)
    session.agent.sessionId = session.id
    this.sessions.set(session.id, session)
    const timeout = setTimeout(() => controller.abort('timeout'), this.config.AGENT_RUN_TIMEOUT_MS),
      previousMessageCount = session.agent.state.messages.length
    try {
      emit({
        type: 'session_started',
        sessionId: session.id,
        agentRunId: request.agentRunId,
      })
      let runError: AgentError | undefined
      try {
        runError = await runAgent({
          agent: session.agent,
          prompt: `${request.turn.prompt}\n\n本轮节点上下文 ID：${JSON.stringify(request.turn.contextNodeIds)}。每轮画布基线已更新，请通过 read_canvas 获取最新状态。`,
          images: request.turn.images,
          signal,
          getCanvas: () => context.workingCandidate,
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
      this.sessions.delete(session.id)
      session.agent.reset()
      session.agent.state.tools = []
      session.agent.streamFunction = async () => {
        throw new Error('运行已结束')
      }
      session.agent.getApiKey = undefined
      request.resolvedModel.apiKey = undefined
      request.agentContextToken = ''
    }
  }
}

export function safeRuntimeError(error: unknown): AgentError {
  return error instanceof RunError
    ? { code: error.code, message: error.message, retryable: true }
    : {
        code: 'AGENT_INTERNAL_ERROR',
        message: 'Agent 执行失败，请重试',
        retryable: true,
      }
}
