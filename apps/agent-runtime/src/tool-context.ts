import type { AgentEvent, AgentSnapshot } from '@ai-workflow/agent-protocol'
import type { Workflow } from '@ai-workflow/core'
import type { ServerClient } from './server-client.js'

export interface ToolContext {
  baselineSnapshot: AgentSnapshot
  workingCandidate: Workflow
  candidateChanged: boolean
  baseSnapshotHash: string
  server: ServerClient
  emit: (event: AgentEvent) => void
}
