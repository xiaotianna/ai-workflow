// Code generated from schemas/execute-node-result.schema.json. DO NOT EDIT.

import type { ProtocolJsonValue } from './json-value.generated'

interface ExecuteNodeResultBase {
  protocolVersion: '1'
  commandId: string
  nodeRunId: string
  executionKey: string
  leaseToken: string
}

export interface ExecuteNodeSucceededResult extends ExecuteNodeResultBase {
  status: 'SUCCEEDED'
  outputs: Record<string, ProtocolJsonValue>
  activatedHandles: string[]
}

export interface ExecuteNodeFailedResult extends ExecuteNodeResultBase {
  status: 'FAILED'
  error: {
    code: string
    message: string
    retryable: boolean
    details?: Record<string, ProtocolJsonValue>
  }
}

export type ExecuteNodeResult =
  | ExecuteNodeSucceededResult
  | ExecuteNodeFailedResult
