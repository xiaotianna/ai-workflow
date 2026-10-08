import type { AgentEvent, AgentError, AgentToolDisplay } from '@ai-workflow/agent-protocol'
import type { ChatModelRunResult, ThreadAssistantMessagePart } from '@assistant-ui/react'

export type AgentRunStatus =
  'idle' | 'starting' | 'running' | 'stopping' | 'completed' | 'cancelled' | 'timed_out' | 'failed'
export interface ToolTrace {
  state: 'queued' | 'running' | 'progress' | 'succeeded' | 'failed' | 'cancelled'
  displayArgs: AgentToolDisplay
  displayResult?: AgentToolDisplay
  queuedAt?: string
  startedAt?: string
  completedAt?: string
  progress?: { message: string; completed?: number; total?: number }
}
export function isAgentActive(status: AgentRunStatus) {
  return status === 'starting' || status === 'running' || status === 'stopping'
}

export class AgentTranscript {
  private parts: ThreadAssistantMessagePart[] = []
  private readonly indices = new Map<string, number>()
  private status: ChatModelRunResult['status'] = { type: 'running' }
  private terminal = false
  private upsert(key: string, part: ThreadAssistantMessagePart) {
    const index = this.indices.get(key)
    if (index === undefined) {
      this.indices.set(key, this.parts.length)
      this.parts.push(part)
    } else this.parts[index] = part
  }
  accept(event: AgentEvent) {
    if (this.terminal) return
    if (event.type === 'reasoning_started') {
      this.upsert(`reasoning:${event.reasoningId}`, {
        type: 'reasoning',
        id: event.reasoningId,
        text: '',
        status: { type: 'running' },
        timing: { startedAt: Date.parse(event.startedAt) },
      })
    } else if (event.type === 'reasoning_delta' || event.type === 'reasoning_finished') {
      const index = this.indices.get(`reasoning:${event.reasoningId}`),
        part = index === undefined ? undefined : this.parts[index]
      if (part?.type === 'reasoning')
        this.upsert(
          `reasoning:${event.reasoningId}`,
          event.type === 'reasoning_delta'
            ? { ...part, text: part.text + event.delta }
            : {
                ...part,
                status: { type: 'complete' },
                timing: {
                  startedAt: part.timing?.startedAt ?? Date.now(),
                  completedAt: Date.parse(event.completedAt),
                },
              },
        )
    } else if (event.type === 'assistant_delta') {
      const last = this.parts.at(-1)
      if (last?.type === 'text')
        this.parts[this.parts.length - 1] = { ...last, text: last.text + event.delta }
      else this.parts.push({ type: 'text', text: event.delta })
    } else if (event.type === 'tool_queued' || event.type === 'tool_started') {
      const index = this.indices.get(`tool:${event.toolCallId}`),
        existing = index === undefined ? undefined : this.parts[index],
        prior = existing?.type === 'tool-call' ? (existing.artifact as ToolTrace) : undefined,
        trace: ToolTrace = {
          ...prior,
          state: event.type === 'tool_queued' ? 'queued' : 'running',
          displayArgs: event.displayArgs,
          ...(event.type === 'tool_queued'
            ? { queuedAt: event.queuedAt }
            : { startedAt: event.startedAt }),
        }
      this.upsert(`tool:${event.toolCallId}`, {
        type: 'tool-call',
        toolCallId: event.toolCallId,
        toolName: event.toolName,
        args: event.displayArgs.fields ?? {},
        argsText: JSON.stringify(event.displayArgs.fields ?? {}),
        artifact: trace,
      })
    } else if (event.type === 'tool_progress' || event.type === 'tool_finished') {
      const index = this.indices.get(`tool:${event.toolCallId}`),
        part = index === undefined ? undefined : this.parts[index]
      if (part?.type === 'tool-call') {
        const prior = part.artifact as ToolTrace,
          trace: ToolTrace =
            event.type === 'tool_progress'
              ? {
                  ...prior,
                  state: 'progress',
                  progress: {
                    message: event.message,
                    completed: event.completed,
                    total: event.total,
                  },
                }
              : {
                  ...prior,
                  state: event.status,
                  completedAt: event.completedAt,
                  displayResult: event.displayResult,
                }
        this.upsert(`tool:${event.toolCallId}`, {
          ...part,
          artifact: trace,
          ...(event.type === 'tool_finished'
            ? { result: event.displayResult, isError: event.status === 'failed' }
            : {}),
        })
      }
    } else if (event.type === 'candidate_ready') {
      this.upsert('candidate', {
        type: 'data',
        name: 'workflow-candidate',
        data: { baseSnapshotHash: event.baseSnapshotHash, workflow: event.workflow },
      })
    } else if (event.type === 'agent_finished') {
      this.finish('completed')
    } else if (event.type === 'agent_cancelled') {
      this.finish('cancelled')
    } else if (event.type === 'agent_failed') {
      this.finish(event.error.code === 'AGENT_TIMEOUT' ? 'timed_out' : 'failed', event.error)
    }
  }
  finish(state: AgentRunStatus, error?: AgentError) {
    if (this.terminal) return
    this.terminal = true
    this.parts = this.parts.map((part) => {
      if (part.type === 'reasoning' && part.status?.type === 'running')
        return {
          ...part,
          status: { type: 'incomplete', reason: 'cancelled' },
          timing: { startedAt: part.timing?.startedAt ?? Date.now(), completedAt: Date.now() },
        }
      if (part.type === 'tool-call' && part.result === undefined)
        return {
          ...part,
          artifact: {
            ...(part.artifact as ToolTrace),
            state: 'cancelled',
            completedAt: new Date().toISOString(),
          },
          result: { summary: '工具已停止' },
        }
      return part
    })
    this.parts.push({
      type: 'data',
      name: 'agent-outcome',
      data: { state, error, completedAt: Date.now() },
    })
    this.status =
      state === 'completed'
        ? { type: 'complete', reason: 'stop' }
        : state === 'cancelled'
          ? { type: 'incomplete', reason: 'cancelled' }
          : { type: 'incomplete', reason: 'error', error: error?.message ?? 'Agent 执行失败' }
  }
  snapshot(): ChatModelRunResult {
    return { content: [...this.parts], status: this.status }
  }
}
