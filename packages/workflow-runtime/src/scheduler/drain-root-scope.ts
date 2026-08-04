import {
  BuiltinNodeType,
  loopNodeSchema,
  type JsonValue,
  type WorkflowNode,
} from '@ai-workflow/core'

import type { ExecutionPlan, StaticScopeKey } from '../compiler/execution-plan'
import type { RuntimeNodeConfigResolver } from '../config/runtime-node-config-resolver'
import { evaluateConditionRules } from '../condition/evaluate-condition-rules'
import { RUNTIME_ERROR_CODES, RuntimeError } from '../runtime/runtime-error'
import {
  beginNodeExecution,
  markNodeSkipped,
  recordBusinessNodeSuccess,
  recordControlNodeSuccess,
  resetScopeState,
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
  scopeKey: StaticScopeKey,
): VariableResolutionContext {
  return { workflow: plan.workflow, state, scopeKey }
}

function dispatchBusinessNode(
  plan: ExecutionPlan,
  state: RuntimeState,
  node: WorkflowNode,
  scopeKey: StaticScopeKey,
  configResolver: RuntimeNodeConfigResolver,
): DispatchNodeEffect {
  const variableContext = createVariableContext(plan, state, scopeKey)
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

function incomingEdgesSettled(plan: ExecutionPlan, state: RuntimeState, nodeId: string): boolean {
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

function activateAllHandles(plan: ExecutionPlan, nodeId: string): Set<string> {
  return new Set((plan.outgoingEdges.get(nodeId) ?? []).map((edge) => edge.sourceHandle))
}

function startLoopIteration(
  plan: ExecutionPlan,
  state: RuntimeState,
  loopNode: WorkflowNode,
): void {
  const loopState = state.loopStates[loopNode.id]!
  const children = plan.childrenByScope.get(loopNode.id) ?? []
  const edges = plan.edgesByScope.get(loopNode.id) ?? []
  resetScopeState(
    state,
    children,
    edges.map((edge) => edge.id),
  )

  const loopStart = children
    .map((nodeId) => plan.nodeById.get(nodeId)!)
    .find((node) => node.type === BuiltinNodeType.LOOP_START)!
  const loopExecution = state.executions[loopState.executionKey]!
  const outputs: Record<string, JsonValue> = {
    input: loopExecution.inputs,
    iteration: loopState.iteration,
  }
  recordControlNodeSuccess(state, loopStart, outputs, loopNode.id)
  settleOutgoingEdges(plan, state, loopStart.id, activateAllHandles(plan, loopStart.id))
}

function beginLoop(
  plan: ExecutionPlan,
  state: RuntimeState,
  node: WorkflowNode,
  scopeKey: StaticScopeKey,
): void {
  const context = createVariableContext(plan, state, scopeKey)
  const config = loopNodeSchema.parse(node.config)
  const inputs = resolveNodeInputs(node, context)
  const { execution } = beginNodeExecution(state, node, inputs, {
    maxIterations: config.maxIterations,
  })
  state.loopStates[node.id] = {
    loopNodeId: node.id,
    parentScopeKey: scopeKey,
    executionKey: execution.executionKey,
    iteration: 1,
    maxIterations: config.maxIterations,
  }
  startLoopIteration(plan, state, node)
}

function completeLoopIteration(
  plan: ExecutionPlan,
  state: RuntimeState,
  exitNode: WorkflowNode,
): boolean {
  const loopNode = plan.nodeById.get(exitNode.parentId!)!
  const loopState = state.loopStates[loopNode.id]!
  const context = createVariableContext(plan, state, loopNode.id)
  const exitInputs = resolveNodeInputs(exitNode, context)
  recordControlNodeSuccess(state, exitNode, exitInputs, loopNode.id)

  const config = loopNodeSchema.parse(loopNode.config)
  const shouldStop =
    loopState.iteration >= loopState.maxIterations ||
    evaluateConditionRules(config.terminationCondition, context)

  if (!shouldStop) {
    loopState.iteration += 1
    startLoopIteration(plan, state, loopNode)
    return false
  }

  recordBusinessNodeSuccess(state, loopState.executionKey, {
    result: exitInputs,
  })
  delete state.loopStates[loopNode.id]
  settleOutgoingEdges(plan, state, loopNode.id, new Set(['result']))
  return true
}

function hasStatusInScope(
  plan: ExecutionPlan,
  state: RuntimeState,
  scopeKey: StaticScopeKey,
  status: string,
): boolean {
  return (plan.childrenByScope.get(scopeKey) ?? []).some(
    (nodeId) => state.nodeStates[nodeId]?.status === status,
  )
}

function drainScope(
  plan: ExecutionPlan,
  state: RuntimeState,
  scopeKey: StaticScopeKey,
  configResolver: RuntimeNodeConfigResolver,
  effects: RuntimeEffect[],
): void {
  const nodeIds = plan.childrenByScope.get(scopeKey) ?? []

  // 恢复后从最内层活跃 Loop 继续推进，不依赖调用方记住当前作用域。
  for (const nodeId of nodeIds) {
    if (state.loopStates[nodeId]) {
      drainScope(plan, state, nodeId, configResolver, effects)
    }
  }

  let progressed = false

  do {
    progressed = false
    for (const nodeId of nodeIds) {
      const node = plan.nodeById.get(nodeId)!
      const nodeState = state.nodeStates[nodeId]!
      if (nodeState.status !== RUNTIME_NODE_STATUSES.WAITING) continue
      if (node.type === BuiltinNodeType.LOOP_START) continue
      if (!incomingEdgesSettled(plan, state, nodeId)) continue

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

      if (node.type === BuiltinNodeType.LOOP_EXIT) {
        progressed = completeLoopIteration(plan, state, node) || true
        continue
      }

      if (node.type === BuiltinNodeType.LOOP) {
        beginLoop(plan, state, node, scopeKey)
        drainScope(plan, state, node.id, configResolver, effects)
        progressed = true
        continue
      }

      effects.push(dispatchBusinessNode(plan, state, node, scopeKey, configResolver))
      progressed = true
    }
  } while (progressed)

  if (hasStatusInScope(plan, state, scopeKey, RUNTIME_NODE_STATUSES.RUNNING)) return
  if (scopeKey !== 'root' && state.loopStates[scopeKey]) return

  if (hasStatusInScope(plan, state, scopeKey, RUNTIME_NODE_STATUSES.WAITING)) {
    throw new RuntimeError(RUNTIME_ERROR_CODES.RUN_STALLED, `Scope ${scopeKey} 没有可推进节点`, {
      scopeKey,
      waitingNodeIds: nodeIds.filter(
        (nodeId) => state.nodeStates[nodeId]?.status === RUNTIME_NODE_STATUSES.WAITING,
      ),
    })
  }
}

export function drainRootScope(
  plan: ExecutionPlan,
  state: RuntimeState,
  configResolver: RuntimeNodeConfigResolver,
): RuntimeEffect[] {
  const effects: RuntimeEffect[] = []
  drainScope(plan, state, 'root', configResolver, effects)
  if (effects.length > 0) return effects

  if (
    Object.values(state.nodeStates).some(
      (nodeState) => nodeState.status === RUNTIME_NODE_STATUSES.RUNNING,
    )
  ) {
    return effects
  }

  const outputs = resolveWorkflowOutputs(createVariableContext(plan, state, 'root'))
  state.status = RUNTIME_RUN_STATUSES.SUCCEEDED
  effects.push({ type: 'COMPLETE_RUN', runId: state.runId, outputs })
  return effects
}
