import type { JsonValue, SystemVariableKey, Workflow, WorkflowNode } from '@ai-workflow/core'

import { RUNTIME_ERROR_CODES, RuntimeError, type RuntimeErrorData } from './runtime-error'
import {
  RUNTIME_EDGE_STATUSES,
  RUNTIME_EXECUTION_STATUSES,
  RUNTIME_NODE_STATUSES,
  RUNTIME_RUN_STATUSES,
  RUNTIME_STATE_SCHEMA_VERSION,
  type RuntimeExecution,
  type RuntimeState,
} from './runtime-state-schema'

export interface BeginNodeExecutionResult {
  execution: RuntimeExecution
}

const MIN_RECORDED_DURATION_MS = 1

function getWaitingNodeState(state: RuntimeState, nodeId: string) {
  const nodeState = state.nodeStates[nodeId]
  if (!nodeState || nodeState.status !== RUNTIME_NODE_STATUSES.WAITING) {
    throw new RuntimeError(
      RUNTIME_ERROR_CODES.RUNTIME_STATE_MISMATCH,
      `节点 ${nodeId} 不处于 WAITING 状态`,
      { nodeId, actualStatus: nodeState?.status ?? null },
    )
  }

  return nodeState
}

function createExecutionKey(state: RuntimeState): string {
  // executionKey 对外不透明；Runtime 和 Server 都禁止通过拆字符串恢复 nodeId/Scope。
  return `${state.runId}:${state.nextExecutionSequence}`
}

function createExecution(
  state: RuntimeState,
  node: WorkflowNode,
  status: RuntimeExecution['status'],
  inputs: Record<string, JsonValue>,
  config: Record<string, JsonValue>,
  outputs?: Record<string, JsonValue>,
  durationMs?: number,
  scopeKey: string = node.parentId ?? 'root',
): RuntimeExecution {
  const nodeState = getWaitingNodeState(state, node.id),
    executionKey = createExecutionKey(state),
    execution: RuntimeExecution = {
      executionKey,
      nodeId: node.id,
      scopeKey,
      ...(state.loopStates[scopeKey] ? { iteration: state.loopStates[scopeKey].iteration } : {}),
      sequence: state.nextExecutionSequence,
      attempt: 1,
      status,
      ...(durationMs !== undefined ? { durationMs } : {}),
      inputs,
      config,
      ...(outputs ? { outputs } : {}),
    }

  state.nextExecutionSequence += 1
  state.executions[executionKey] = execution
  nodeState.latestExecutionKey = executionKey
  nodeState.status =
    status === RUNTIME_EXECUTION_STATUSES.RUNNING
      ? RUNTIME_NODE_STATUSES.RUNNING
      : RUNTIME_NODE_STATUSES.SUCCEEDED

  return execution
}

export function createInitialRuntimeState(
  workflow: Workflow,
  identity: { runId: string; workflowVersionId: string },
  startInput: Record<string, JsonValue>,
  systemVariables: Record<SystemVariableKey, JsonValue>,
): RuntimeState {
  return {
    schemaVersion: RUNTIME_STATE_SCHEMA_VERSION,
    revision: 0,
    runId: identity.runId,
    workflowId: workflow.id,
    workflowVersionId: identity.workflowVersionId,
    status: RUNTIME_RUN_STATUSES.RUNNING,
    startInput,
    systemVariables,
    nodeStates: Object.fromEntries(
      workflow.nodes.map((node) => [node.id, { status: RUNTIME_NODE_STATUSES.WAITING }]),
    ),
    edgeStates: Object.fromEntries(
      workflow.edges.map((edge) => [edge.id, RUNTIME_EDGE_STATUSES.WAITING]),
    ),
    executions: {},
    loopStates: {},
    nextExecutionSequence: 0,
  }
}

export function beginNodeExecution(
  state: RuntimeState,
  node: WorkflowNode,
  inputs: Record<string, JsonValue>,
  config: Record<string, JsonValue>,
): BeginNodeExecutionResult {
  return {
    execution: createExecution(state, node, RUNTIME_EXECUTION_STATUSES.RUNNING, inputs, config),
  }
}

export function recordControlNodeSuccess(
  state: RuntimeState,
  node: WorkflowNode,
  outputs: Record<string, JsonValue>,
  scopeKey: string = node.parentId ?? 'root',
  inputs: Record<string, JsonValue> = {},
): RuntimeExecution {
  return createExecution(
    state,
    node,
    RUNTIME_EXECUTION_STATUSES.SUCCEEDED,
    inputs,
    {},
    outputs,
    MIN_RECORDED_DURATION_MS,
    scopeKey,
  )
}

export function resetScopeState(
  state: RuntimeState,
  nodeIds: readonly string[],
  edgeIds: readonly string[],
): void {
  for (const nodeId of nodeIds) {
    state.nodeStates[nodeId] = { status: RUNTIME_NODE_STATUSES.WAITING }
  }
  for (const edgeId of edgeIds) {
    state.edgeStates[edgeId] = RUNTIME_EDGE_STATUSES.WAITING
  }
}

export function recordBusinessNodeSuccess(
  state: RuntimeState,
  executionKey: string,
  outputs: Record<string, JsonValue>,
): void {
  const execution = state.executions[executionKey]
  if (!execution || execution.status !== RUNTIME_EXECUTION_STATUSES.RUNNING) {
    throw new RuntimeError(
      RUNTIME_ERROR_CODES.RUNTIME_STATE_MISMATCH,
      `Execution ${executionKey} 不处于 RUNNING 状态`,
      { executionKey },
    )
  }

  const nodeState = state.nodeStates[execution.nodeId]
  if (
    !nodeState ||
    nodeState.status !== RUNTIME_NODE_STATUSES.RUNNING ||
    nodeState.latestExecutionKey !== executionKey
  ) {
    throw new RuntimeError(
      RUNTIME_ERROR_CODES.RUNTIME_STATE_MISMATCH,
      `Execution ${executionKey} 与节点状态不一致`,
      { executionKey, nodeId: execution.nodeId },
    )
  }

  execution.status = RUNTIME_EXECUTION_STATUSES.SUCCEEDED
  execution.outputs = outputs
  nodeState.status = RUNTIME_NODE_STATUSES.SUCCEEDED
}

export function recordBusinessNodeFailure(
  state: RuntimeState,
  executionKey: string,
  error: RuntimeErrorData,
): void {
  const execution = state.executions[executionKey]
  if (!execution || execution.status !== RUNTIME_EXECUTION_STATUSES.RUNNING) {
    throw new RuntimeError(
      RUNTIME_ERROR_CODES.RUNTIME_STATE_MISMATCH,
      `Execution ${executionKey} 不处于 RUNNING 状态`,
      { executionKey },
    )
  }

  const nodeState = state.nodeStates[execution.nodeId]
  if (
    !nodeState ||
    nodeState.status !== RUNTIME_NODE_STATUSES.RUNNING ||
    nodeState.latestExecutionKey !== executionKey
  ) {
    throw new RuntimeError(
      RUNTIME_ERROR_CODES.RUNTIME_STATE_MISMATCH,
      `Execution ${executionKey} 与节点状态不一致`,
      { executionKey, nodeId: execution.nodeId },
    )
  }

  execution.status = RUNTIME_EXECUTION_STATUSES.FAILED
  execution.error = error
  nodeState.status = RUNTIME_NODE_STATUSES.FAILED
}

export function markNodeSkipped(state: RuntimeState, nodeId: string): void {
  const nodeState = getWaitingNodeState(state, nodeId)
  nodeState.status = RUNTIME_NODE_STATUSES.SKIPPED
}

export function failRuntimeState(state: RuntimeState, error: RuntimeErrorData): void {
  state.status = RUNTIME_RUN_STATUSES.FAILED

  for (const execution of Object.values(state.executions)) {
    if (execution.status === RUNTIME_EXECUTION_STATUSES.RUNNING) {
      execution.status = RUNTIME_EXECUTION_STATUSES.FAILED
      execution.error = error
    }
  }

  for (const nodeState of Object.values(state.nodeStates)) {
    if (nodeState.status === RUNTIME_NODE_STATUSES.RUNNING) {
      nodeState.status = RUNTIME_NODE_STATUSES.FAILED
    }
  }
}
