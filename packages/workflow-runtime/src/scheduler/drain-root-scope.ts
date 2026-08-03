import { BuiltinNodeType, type WorkflowNode } from '@ai-workflow/core'

import type { ExecutionPlan } from '../compiler/execution-plan'
import type { RuntimeNodeConfigResolver } from '../config/runtime-node-config-resolver'
import { RUNTIME_ERROR_CODES, RuntimeError } from '../runtime/runtime-error'
import {
  beginNodeExecution,
  markNodeSkipped,
  recordControlNodeSuccess,
} from '../runtime/runtime-state-operations'
import {
  RUNTIME_EDGE_STATUSES,
  RUNTIME_NODE_STATUSES,
  RUNTIME_RUN_STATUSES,
  type RuntimeState,
} from '../runtime/runtime-state-schema'
import type { DispatchNodeEffect, RuntimeEffect } from '../runtime/runtime-types'
import { resolveNodeInputs } from '../variable/resolve-node-inputs'
import {
  resolveVariableValue,
  type VariableResolutionContext,
} from '../variable/resolve-variable-value'
import { resolveWorkflowOutputs } from '../variable/resolve-workflow-outputs'
import { settleOutgoingEdges } from './settle-outgoing-edges'

function createVariableContext(
  plan: ExecutionPlan,
  state: RuntimeState,
): VariableResolutionContext {
  return {
    workflow: plan.workflow,
    state,
    scopeKey: 'root',
  }
}

function dispatchBusinessNode(
  plan: ExecutionPlan,
  state: RuntimeState,
  node: WorkflowNode,
  configResolver: RuntimeNodeConfigResolver,
): DispatchNodeEffect {
  const variableContext = createVariableContext(plan, state)
  const inputs = resolveNodeInputs(node, variableContext)
  const config = configResolver.resolve(node, (value) =>
    resolveVariableValue(value, variableContext),
  )
  const { execution } = beginNodeExecution(state, node, inputs, config)

  return {
    type: 'DISPATCH_NODE',
    runId: state.runId,
    nodeId: node.id,
    nodeType: node.type,
    executionKey: execution.executionKey,
    attempt: execution.attempt,
    inputs,
    config,
  }
}

function areAllIncomingEdgesSettled(
  plan: ExecutionPlan,
  state: RuntimeState,
  nodeId: string,
): boolean {
  const incomingEdges = plan.incomingEdges.get(nodeId) ?? []
  return (
    incomingEdges.length > 0 &&
    incomingEdges.every((edge) => state.edgeStates[edge.id] !== RUNTIME_EDGE_STATUSES.WAITING)
  )
}

function hasActiveIncomingEdge(plan: ExecutionPlan, state: RuntimeState, nodeId: string): boolean {
  return (plan.incomingEdges.get(nodeId) ?? []).some(
    (edge) => state.edgeStates[edge.id] === RUNTIME_EDGE_STATUSES.ACTIVE,
  )
}

function hasRunningNode(state: RuntimeState): boolean {
  return Object.values(state.nodeStates).some(
    (nodeState) => nodeState.status === RUNTIME_NODE_STATUSES.RUNNING,
  )
}

function hasWaitingNode(state: RuntimeState): boolean {
  return Object.values(state.nodeStates).some(
    (nodeState) => nodeState.status === RUNTIME_NODE_STATUSES.WAITING,
  )
}

/**
 * dag核心调度逻辑
 * 不会真正执行业务节点，只会修改状态并返回 RuntimeEffect[]
 * 该方法不是控制整个dag执行，而是控制整个根 DAG 的一次调度推进，但不执行具体 Node。
 * 一次调用可能同时调度零个、一个或多个 Node。
 * 具体调用分为两种情况：1、初始调用，2、node执行完成调用（不断重复调用）
  start()
    ↓
  drainRootScope()
    ↓
  派发 Node
    ↓
  Node 执行完成
    ↓
  applyNodeResult()
    ↓
  drainRootScope()
    ↓
  派发下一批 Node
    ↓
  ……
    ↓
  COMPLETE_RUN / FAIL_RUN
 */
export function drainRootScope(
  // node、入边、出边查询索引
  plan: ExecutionPlan,
  // 当前运行的node、edge、Execution状态
  state: RuntimeState,
  /**
   * 把节点的node.config转换为本次执行可以直接发送给go executor的纯json配置
   * 因为有些节点中包含了变量，这些变量可以解析后，统一给go一个静态json
   * 解析主要是根据：createRuntimeNodeConfigResolver
   */
  configResolver: RuntimeNodeConfigResolver,
): RuntimeEffect[] {
  // 初始化
  // 收集需要派发的业务节点
  const effects: RuntimeEffect[] = []
  // 第一阶段只调度根scope节点
  const rootNodeIds = plan.childrenByScope.get('root') ?? []
  // 记录本轮是否有节点状态发生变化
  let progressed = false

  do {
    progressed = false

    // 扫描所有的根节点
    for (const nodeId of rootNodeIds) {
      const node = plan.nodeById.get(nodeId)!
      const nodeState = state.nodeStates[nodeId]!
      /**
       * 如果当前节点不是WAITING就忽略，只有 WAITING 节点才可能在本轮被调度
       * 如果节点已经是：RUNNING、SUCCEEDED、FAILED、SKIPPED，就直接跳到下一个节点
       */
      if (nodeState.status !== RUNTIME_NODE_STATUSES.WAITING) {
        continue
      }

      /**
       * 等待全部入边确定
       * 判断条件：
       * 1、当前节点至少有一条入边
       * 2、全部入边都已经不是WAITING
       * 因为下面这种情况：
       *  A ─┐
            ├→ C
          B ─┘
          当：A → C = ACTIVE，B → C = WAITING
          那么C也不能立即执行
       */
      if (!areAllIncomingEdgesSettled(plan, state, nodeId)) {
        continue
      }

      // 代码走到这里，证明入边已经确定，那么没有一条入边是ACTIVE，证明所有都是INACTIVE
      // 表示当前节点所在的路径没有被激活的，索引不能执行
      if (!hasActiveIncomingEdge(plan, state, nodeId)) {
        markNodeSkipped(state, nodeId)
        settleOutgoingEdges(plan, state, nodeId, new Set())
        progressed = true
        continue
      }

      if (node.type === BuiltinNodeType.END) {
        recordControlNodeSuccess(state, node, {})
        settleOutgoingEdges(plan, state, nodeId, new Set())
        progressed = true
        continue
      }

      effects.push(dispatchBusinessNode(plan, state, node, configResolver))
      progressed = true
    }
  } while (progressed)

  if (hasRunningNode(state)) {
    return effects
  }

  if (hasWaitingNode(state)) {
    throw new RuntimeError(
      RUNTIME_ERROR_CODES.RUN_STALLED,
      '根 DAG 没有可推进节点且仍存在 WAITING 节点',
      {
        waitingNodeIds: Object.entries(state.nodeStates)
          .filter(([, nodeState]) => nodeState.status === RUNTIME_NODE_STATUSES.WAITING)
          .map(([nodeId]) => nodeId),
      },
    )
  }

  const outputs = resolveWorkflowOutputs(createVariableContext(plan, state))
  state.status = RUNTIME_RUN_STATUSES.SUCCEEDED
  effects.push({
    type: 'COMPLETE_RUN',
    runId: state.runId,
    outputs,
  })

  return effects
}
