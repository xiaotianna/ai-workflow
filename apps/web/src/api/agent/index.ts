import { parseAgentEvent, type AgentEvent, type AgentTurn } from '@ai-workflow/agent-protocol'
import { apiClient } from '@/api/client'

export function streamAgentTurn(
  appId: string,
  turn: AgentTurn,
  signal: AbortSignal,
  onEvent: (event: AgentEvent) => void,
) {
  return apiClient.postSse(`/studio/apps/${appId}/agent/runs`, turn, {
    signal,
    onMessage: (message) => onEvent(parseAgentEvent(JSON.parse(message.data))),
  })
}
export function abortAgentSession(appId: string, sessionId: string) {
  return apiClient.post(`/studio/apps/${appId}/agent/sessions/${sessionId}/abort`, undefined, {
    timeout: 5000,
  })
}
