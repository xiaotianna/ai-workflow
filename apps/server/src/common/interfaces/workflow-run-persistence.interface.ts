import type { ExecuteNodeCommand, ExecuteNodeResult } from '@ai-workflow/protocol'
import type { JsonValue } from '@ai-workflow/core'
import type { RuntimeErrorData, RuntimeState } from '@ai-workflow/runtime'

export interface PreparedNodeDispatch {
  command: ExecuteNodeCommand
}

export interface RuntimeTerminalData {
  status: RuntimeState['status']
  output?: Record<string, JsonValue>
  error?: RuntimeErrorData
}

export interface RuntimeTransitionPersistence {
  expectedRevision: number
  state: RuntimeState
  terminal: RuntimeTerminalData
  dispatches: readonly PreparedNodeDispatch[]
  result: ExecuteNodeResult
  transportError?: string
}
