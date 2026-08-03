import type { ExecutionPlan } from '../compiler/execution-plan'
import { RUNTIME_ERROR_CODES, RuntimeError } from '../runtime/runtime-error'
import { RUNTIME_EDGE_STATUSES, type RuntimeState } from '../runtime/runtime-state-schema'

// 作用：一个节点执行结束后，根据它激活了哪些输出 Handle
// 把该节点所有出边从 WAITING 确定为 ACTIVE 或 INACTIVE
export function settleOutgoingEdges(
  plan: ExecutionPlan,
  state: RuntimeState,
  nodeId: string,
  activatedHandles: ReadonlySet<string>,
): void {
  for (const edge of plan.outgoingEdges.get(nodeId) ?? []) {
    const currentStatus = state.edgeStates[edge.id]
    if (currentStatus !== RUNTIME_EDGE_STATUSES.WAITING) {
      throw new RuntimeError(
        RUNTIME_ERROR_CODES.RUNTIME_STATE_MISMATCH,
        `Edge ${edge.id} 已经离开 WAITING 状态`,
        { edgeId: edge.id, actualStatus: currentStatus ?? null },
      )
    }

    state.edgeStates[edge.id] = activatedHandles.has(edge.sourceHandle)
      ? RUNTIME_EDGE_STATUSES.ACTIVE
      : RUNTIME_EDGE_STATUSES.INACTIVE
  }
}
