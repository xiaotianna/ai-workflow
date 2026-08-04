import { BuiltinNodeType, type Workflow, type WorkflowNode } from '@ai-workflow/core'
import type { ExecuteNodeResult } from '@ai-workflow/protocol'

import { buildExecutionPlan } from '../compiler/build-execution-plan'
import type { ExecutionPlan } from '../compiler/execution-plan'
import type { RuntimeNodeConfigResolver } from '../config/runtime-node-config-resolver'
import { normalizeDeclaredValues } from '../input/normalize-declared-values'
import { drainRootScope } from '../scheduler/drain-root-scope'
import { settleOutgoingEdges } from '../scheduler/settle-outgoing-edges'
import { parseSystemVariables } from '../system/parse-system-variables'
import { parseJsonObject } from '../utils/json-value'
import { resolveNodeOutputs } from '../variable/resolve-node-outputs'
import { RUNTIME_ERROR_CODES, RuntimeError, toRuntimeError } from './runtime-error'
import {
  createInitialRuntimeState,
  failRuntimeState,
  recordBusinessNodeFailure,
  recordBusinessNodeSuccess,
  recordControlNodeSuccess,
} from './runtime-state-operations'
import {
  RUNTIME_EXECUTION_STATUSES,
  RUNTIME_NODE_STATUSES,
  RUNTIME_RUN_STATUSES,
  type RuntimeExecution,
  type RuntimeState,
} from './runtime-state-schema'
import type { RuntimeTransition, StartRuntimeInput } from './runtime-types'
import { restoreRuntimeState } from './restore-runtime-state'
import type { WorkflowRuntime } from './workflow-runtime'

export interface CreateWorkflowRuntimeOptions {
  workflowVersionId: string
  configResolver: RuntimeNodeConfigResolver
}

function getRootStartNode(plan: ExecutionPlan): WorkflowNode {
  const startNodes = (plan.childrenByScope.get('root') ?? [])
    .map((nodeId) => plan.nodeById.get(nodeId)!)
    .filter((node) => node.type === BuiltinNodeType.START)

  if (startNodes.length !== 1) {
    throw new RuntimeError(
      RUNTIME_ERROR_CODES.RUNTIME_STATE_MISMATCH,
      'Runtime 前置条件要求根作用域恰好存在一个 Start 节点',
      { actualStartCount: startNodes.length },
    )
  }

  return startNodes[0]!
}

function getRunningExecution(state: RuntimeState, executionKey: string): RuntimeExecution {
  const execution = state.executions[executionKey]
  if (!execution || execution.status !== RUNTIME_EXECUTION_STATUSES.RUNNING) {
    throw new RuntimeError(
      RUNTIME_ERROR_CODES.RUNTIME_STATE_MISMATCH,
      '节点结果没有对应的 RUNNING Execution',
      { executionKey },
    )
  }

  const nodeState = state.nodeStates[execution.nodeId]
  if (
    nodeState?.latestExecutionKey !== executionKey ||
    nodeState.status !== RUNTIME_NODE_STATUSES.RUNNING
  ) {
    throw new RuntimeError(
      RUNTIME_ERROR_CODES.RUNTIME_STATE_MISMATCH,
      '节点结果与当前节点执行位置不一致',
      { executionKey, nodeId: execution.nodeId },
    )
  }

  return execution
}

function createFailureTransition(
  state: RuntimeState,
  error: RuntimeError,
  nextRevision: number,
): RuntimeTransition {
  const errorData = error.toData()
  failRuntimeState(state, errorData)
  state.revision = nextRevision

  return {
    state,
    effects: [
      {
        type: 'FAIL_RUN',
        runId: state.runId,
        error: errorData,
      },
    ],
  }
}

function activateAllStartHandles(plan: ExecutionPlan, startNodeId: string): Set<string> {
  return new Set((plan.outgoingEdges.get(startNodeId) ?? []).map((edge) => edge.sourceHandle))
}

function createExecutorFailure(
  result: Extract<ExecuteNodeResult, { status: 'FAILED' }>,
): RuntimeError {
  const executorDetails = result.error.details
    ? parseJsonObject(result.error.details, 'nodeResult.error.details')
    : undefined

  return new RuntimeError(RUNTIME_ERROR_CODES.NODE_EXECUTION_FAILED, result.error.message, {
    executorCode: result.error.code,
    retryable: result.error.retryable,
    ...(executorDetails ? { executorDetails } : {}),
  })
}

class DefaultWorkflowRuntime implements WorkflowRuntime {
  private readonly plan: ExecutionPlan
  private readonly workflowVersionId: string
  private readonly configResolver: RuntimeNodeConfigResolver

  constructor(workflow: Workflow, options: CreateWorkflowRuntimeOptions) {
    if (!options.workflowVersionId) {
      throw new RuntimeError(
        RUNTIME_ERROR_CODES.RUNTIME_IDENTITY_MISMATCH,
        'workflowVersionId 不能为空',
      )
    }

    this.plan = buildExecutionPlan(workflow)
    this.workflowVersionId = options.workflowVersionId
    this.configResolver = options.configResolver
  }

  start(input: StartRuntimeInput): RuntimeTransition {
    if (!input.runId) {
      throw new RuntimeError(RUNTIME_ERROR_CODES.RUNTIME_IDENTITY_MISMATCH, 'runId 不能为空')
    }

    const startNode = getRootStartNode(this.plan)
    const systemVariables = parseSystemVariables(input.systemVariables, {
      runId: input.runId,
      workflowId: this.plan.workflow.id,
    })
    const startInput = normalizeDeclaredValues(input.input, startNode.outputs, {
      boundary: 'startInput',
      ownerId: startNode.id,
      unknownValuePolicy: 'reject',
    })
    const state = createInitialRuntimeState(
      this.plan.workflow,
      { runId: input.runId, workflowVersionId: this.workflowVersionId },
      startInput,
      systemVariables,
    )

    recordControlNodeSuccess(state, startNode, startInput)
    settleOutgoingEdges(
      this.plan,
      state,
      startNode.id,
      activateAllStartHandles(this.plan, startNode.id),
    )

    try {
      // 初始化调度，让start节点开始运行
      const effects = drainRootScope(this.plan, state, this.configResolver)
      state.revision = 1
      return { state, effects }
    } catch (error) {
      return createFailureTransition(state, toRuntimeError(error), 1)
    }
  }

  applyNodeResult(state: RuntimeState, result: ExecuteNodeResult): RuntimeTransition {
    const restoredState = restoreRuntimeState(
      state,
      {
        runId: state.runId,
        workflowId: this.plan.workflow.id,
        workflowVersionId: this.workflowVersionId,
      },
      this.plan.workflow,
    )

    if (restoredState.status !== RUNTIME_RUN_STATUSES.RUNNING) {
      throw new RuntimeError(
        RUNTIME_ERROR_CODES.RUN_ALREADY_TERMINAL,
        '终态 Run 不能继续应用节点结果',
        { runId: restoredState.runId, status: restoredState.status },
      )
    }

    // 迟到、重复或错误 executionKey 是消息关联错误，应由 Server 拒绝，不能把有效 Run 改成失败。
    const execution = getRunningExecution(restoredState, result.executionKey)
    const node = this.plan.nodeById.get(execution.nodeId)
    if (!node) {
      throw new RuntimeError(
        RUNTIME_ERROR_CODES.RUNTIME_STATE_MISMATCH,
        'Execution 对应节点不在当前 WorkflowVersion 中',
        { executionKey: execution.executionKey, nodeId: execution.nodeId },
      )
    }

    if (node.type === BuiltinNodeType.START || node.type === BuiltinNodeType.END) {
      throw new RuntimeError(
        RUNTIME_ERROR_CODES.RUNTIME_STATE_MISMATCH,
        '本地控制节点不能接收 Executor 结果',
        { executionKey: execution.executionKey, nodeId: execution.nodeId },
      )
    }

    const nextRevision = restoredState.revision + 1

    if (result.status === 'FAILED') {
      const failure = createExecutorFailure(result)
      recordBusinessNodeFailure(restoredState, execution.executionKey, failure.toData())
      return createFailureTransition(restoredState, failure, nextRevision)
    }

    try {
      const outputs = resolveNodeOutputs(result.outputs, node, {
        workflow: this.plan.workflow,
        state: restoredState,
        scopeKey: 'root',
      })
      recordBusinessNodeSuccess(restoredState, execution.executionKey, outputs)
      settleOutgoingEdges(this.plan, restoredState, node.id, new Set(result.activatedHandles))

      // 在节点执行成功后继续调用
      const effects = drainRootScope(this.plan, restoredState, this.configResolver)
      restoredState.revision = nextRevision
      return { state: restoredState, effects }
    } catch (error) {
      return createFailureTransition(restoredState, toRuntimeError(error), nextRevision)
    }
  }
}

export function createWorkflowRuntime(
  workflow: Workflow,
  options: CreateWorkflowRuntimeOptions,
): WorkflowRuntime {
  return new DefaultWorkflowRuntime(workflow, options)
}
