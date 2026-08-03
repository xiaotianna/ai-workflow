import { SYSTEM_VARIABLE_KEYS, type Workflow } from '@ai-workflow/core'

import { parseSystemVariables } from '../system/parse-system-variables'
import { hasOwn } from '../utils/has-own'
import { RUNTIME_ERROR_CODES, RuntimeError } from './runtime-error'
import {
  RUNTIME_EDGE_STATUSES,
  RUNTIME_EXECUTION_STATUSES,
  RUNTIME_NODE_STATUSES,
  RUNTIME_RUN_STATUSES,
  runtimeStateSchema,
  type RuntimeState,
} from './runtime-state-schema'

export interface ExpectedRuntimeIdentity {
  runId: string
  workflowId: string
  workflowVersionId: string
}

function assertMatchingKeys(
  expectedIds: ReadonlySet<string>,
  actualValues: Readonly<Record<string, unknown>>,
  label: 'Node' | 'Edge',
): void {
  const actualIds = Object.keys(actualValues)
  const missingIds = [...expectedIds].filter((id) => !hasOwn(actualValues, id))
  const unknownIds = actualIds.filter((id) => !expectedIds.has(id))

  if (missingIds.length > 0 || unknownIds.length > 0) {
    throw new RuntimeError(
      RUNTIME_ERROR_CODES.RUNTIME_STATE_MISMATCH,
      `RuntimeState 的 ${label} 索引与 WorkflowVersion 不一致`,
      {
        [`missing${label}Ids`]: missingIds,
        [`unknown${label}Ids`]: unknownIds,
      },
    )
  }
}

function assertExecutionIndex(state: RuntimeState): void {
  for (const [executionKey, execution] of Object.entries(state.executions)) {
    if (execution.executionKey !== executionKey) {
      throw new RuntimeError(
        RUNTIME_ERROR_CODES.RUNTIME_STATE_MISMATCH,
        'Execution 索引键与记录身份不一致',
        { executionKey, recordExecutionKey: execution.executionKey },
      )
    }

    const nodeState = state.nodeStates[execution.nodeId]
    if (!nodeState) {
      throw new RuntimeError(
        RUNTIME_ERROR_CODES.RUNTIME_STATE_MISMATCH,
        'Execution 引用了不存在的节点状态',
        { executionKey, nodeId: execution.nodeId },
      )
    }

    const hasOutputs = execution.outputs !== undefined
    const hasError = execution.error !== undefined
    const payloadMatchesStatus =
      (execution.status === RUNTIME_EXECUTION_STATUSES.RUNNING && !hasOutputs && !hasError) ||
      (execution.status === RUNTIME_EXECUTION_STATUSES.SUCCEEDED && hasOutputs && !hasError) ||
      (execution.status === RUNTIME_EXECUTION_STATUSES.FAILED && !hasOutputs && hasError)

    if (!payloadMatchesStatus) {
      throw new RuntimeError(
        RUNTIME_ERROR_CODES.RUNTIME_STATE_MISMATCH,
        'Execution 状态与输出或错误字段不一致',
        {
          executionKey,
          executionStatus: execution.status,
          hasOutputs,
          hasError,
        },
      )
    }
  }
}

function assertLatestExecutions(state: RuntimeState): void {
  for (const [nodeId, nodeState] of Object.entries(state.nodeStates)) {
    if (!nodeState.latestExecutionKey) {
      if (
        nodeState.status === 'RUNNING' ||
        nodeState.status === 'SUCCEEDED' ||
        nodeState.status === 'FAILED'
      ) {
        throw new RuntimeError(
          RUNTIME_ERROR_CODES.RUNTIME_STATE_MISMATCH,
          '终态或运行中节点缺少 latestExecutionKey',
          { nodeId, nodeStatus: nodeState.status },
        )
      }
      continue
    }

    const execution = state.executions[nodeState.latestExecutionKey]
    if (!execution || execution.nodeId !== nodeId) {
      throw new RuntimeError(
        RUNTIME_ERROR_CODES.RUNTIME_STATE_MISMATCH,
        'latestExecutionKey 没有指向当前节点的 Execution',
        { nodeId, executionKey: nodeState.latestExecutionKey },
      )
    }

    const matchingStatus =
      (nodeState.status === 'RUNNING' && execution.status === 'RUNNING') ||
      (nodeState.status === 'SUCCEEDED' && execution.status === 'SUCCEEDED') ||
      (nodeState.status === 'FAILED' && execution.status === 'FAILED')

    if (!matchingStatus) {
      throw new RuntimeError(
        RUNTIME_ERROR_CODES.RUNTIME_STATE_MISMATCH,
        '节点状态与 latest Execution 状态不一致',
        {
          nodeId,
          nodeStatus: nodeState.status,
          executionKey: execution.executionKey,
          executionStatus: execution.status,
        },
      )
    }
  }
}

function assertExecutionSequences(state: RuntimeState): void {
  const sequences = Object.values(state.executions).map((execution) => execution.sequence)
  if (new Set(sequences).size !== sequences.length) {
    throw new RuntimeError(
      RUNTIME_ERROR_CODES.RUNTIME_STATE_MISMATCH,
      'Execution sequence 不能重复',
    )
  }

  const minimumNextSequence = sequences.length === 0 ? 0 : Math.max(...sequences) + 1
  if (state.nextExecutionSequence < minimumNextSequence) {
    throw new RuntimeError(
      RUNTIME_ERROR_CODES.RUNTIME_STATE_MISMATCH,
      'nextExecutionSequence 小于已有 Execution sequence',
      {
        nextExecutionSequence: state.nextExecutionSequence,
        minimumNextSequence,
      },
    )
  }
}

function assertRunStatus(state: RuntimeState): void {
  const nodeStatuses = new Set(Object.values(state.nodeStates).map((nodeState) => nodeState.status))
  const executionStatuses = new Set(
    Object.values(state.executions).map((execution) => execution.status),
  )

  const hasRunningRecord =
    nodeStatuses.has(RUNTIME_NODE_STATUSES.RUNNING) &&
    executionStatuses.has(RUNTIME_EXECUTION_STATUSES.RUNNING)
  const hasFailedRecord =
    nodeStatuses.has(RUNTIME_NODE_STATUSES.FAILED) ||
    executionStatuses.has(RUNTIME_EXECUTION_STATUSES.FAILED)

  if (state.status === RUNTIME_RUN_STATUSES.RUNNING && (!hasRunningRecord || hasFailedRecord)) {
    throw new RuntimeError(
      RUNTIME_ERROR_CODES.RUNTIME_STATE_MISMATCH,
      'RUNNING Run 必须存在运行中的节点且不能包含失败记录',
    )
  }

  if (
    state.status === RUNTIME_RUN_STATUSES.SUCCEEDED &&
    ([...nodeStatuses].some(
      (status) =>
        status !== RUNTIME_NODE_STATUSES.SUCCEEDED && status !== RUNTIME_NODE_STATUSES.SKIPPED,
    ) ||
      Object.values(state.edgeStates).some((status) => status === RUNTIME_EDGE_STATUSES.WAITING))
  ) {
    throw new RuntimeError(
      RUNTIME_ERROR_CODES.RUNTIME_STATE_MISMATCH,
      'SUCCEEDED Run 不能包含未完成节点或 WAITING Edge',
    )
  }

  if (state.status === RUNTIME_RUN_STATUSES.FAILED && hasRunningRecord) {
    throw new RuntimeError(
      RUNTIME_ERROR_CODES.RUNTIME_STATE_MISMATCH,
      'FAILED Run 不能包含运行中的节点或 Execution',
    )
  }
}

export function restoreRuntimeState(
  rawState: unknown,
  expected: ExpectedRuntimeIdentity,
  workflow: Workflow,
): RuntimeState {
  const parsed = runtimeStateSchema.safeParse(rawState)
  if (!parsed.success) {
    throw new RuntimeError(RUNTIME_ERROR_CODES.INVALID_RUNTIME_STATE, 'RuntimeState 结构不合法', {
      issues: parsed.error.issues.map((issue) => issue.message),
    })
  }

  const state = parsed.data
  if (
    expected.workflowId !== workflow.id ||
    state.runId !== expected.runId ||
    state.workflowId !== expected.workflowId ||
    state.workflowVersionId !== expected.workflowVersionId
  ) {
    throw new RuntimeError(
      RUNTIME_ERROR_CODES.RUNTIME_IDENTITY_MISMATCH,
      'RuntimeState 与当前 Run 或 WorkflowVersion 不一致',
      {
        expectedRunId: expected.runId,
        actualRunId: state.runId,
        expectedWorkflowId: expected.workflowId,
        actualWorkflowId: state.workflowId,
        snapshotWorkflowId: workflow.id,
        expectedWorkflowVersionId: expected.workflowVersionId,
        actualWorkflowVersionId: state.workflowVersionId,
      },
    )
  }

  if (
    state.systemVariables[SYSTEM_VARIABLE_KEYS.WORKFLOW_ID] !== state.workflowId ||
    state.systemVariables[SYSTEM_VARIABLE_KEYS.WORKFLOW_RUN_ID] !== state.runId
  ) {
    throw new RuntimeError(
      RUNTIME_ERROR_CODES.RUNTIME_IDENTITY_MISMATCH,
      'RuntimeState 中的系统变量身份不一致',
    )
  }

  assertMatchingKeys(new Set(workflow.nodes.map((node) => node.id)), state.nodeStates, 'Node')
  assertMatchingKeys(new Set(workflow.edges.map((edge) => edge.id)), state.edgeStates, 'Edge')

  state.systemVariables = parseSystemVariables(state.systemVariables, {
    runId: state.runId,
    workflowId: state.workflowId,
  })

  assertExecutionIndex(state)
  assertLatestExecutions(state)
  assertExecutionSequences(state)
  assertRunStatus(state)

  return state
}
