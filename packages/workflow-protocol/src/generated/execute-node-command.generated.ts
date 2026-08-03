// Code generated from schemas/execute-node-command.schema.json. DO NOT EDIT.

import type { ProtocolJsonValue } from './json-value.generated'

export interface ExecuteNodeCommand {
  protocolVersion: '1'
  commandId: string
  idempotencyKey: string
  runId: string
  nodeRunId: string
  nodeId: string
  nodeType: string
  executionKey: string
  attempt: number
  leaseToken: string
  deadlineAt: string
  inputs: Record<string, ProtocolJsonValue>
  config: Record<string, ProtocolJsonValue>
}
