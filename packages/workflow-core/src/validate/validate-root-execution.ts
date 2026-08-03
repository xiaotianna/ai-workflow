import type { WorkflowEdge } from '../edge/workflow-edge-schema'
import type { WorkflowNode } from '../node'
import { BuiltinNodeType } from '../nodes/builtin-node-types'
import type { ReportValidationIssueFn } from './validate-types'

function collectReachableNodeIds(
  startIds: readonly string[],
  adjacency: ReadonlyMap<string, string[]>,
) {
  const reachable = new Set<string>()
  const queue = [...startIds]

  for (const nodeId of queue) {
    if (reachable.has(nodeId)) continue

    reachable.add(nodeId)
    queue.push(...(adjacency.get(nodeId) ?? []))
  }

  return reachable
}

function createAdjacency(edges: readonly WorkflowEdge[], reverse = false) {
  const adjacency = new Map<string, string[]>()

  for (const edge of edges) {
    const source = reverse ? edge.target : edge.source
    const target = reverse ? edge.source : edge.target
    const targets = adjacency.get(source)

    if (targets) {
      targets.push(target)
    } else {
      adjacency.set(source, [target])
    }
  }

  return adjacency
}

/**
 * 校验根 DAG 进入 Runtime 前必须成立的控制节点和可达性约束。
 * Loop 内部作用域由 Loop 结构校验负责，不参与根 DAG 的可达性计算。
 */
export function validateRootExecution(
  nodes: readonly WorkflowNode[],
  edges: readonly WorkflowEdge[],
  report: ReportValidationIssueFn,
): void {
  const rootNodes = nodes.filter((node) => node.parentId === undefined)
  const rootNodeIds = new Set(rootNodes.map((node) => node.id))
  const rootEdges = edges.filter(
    (edge) => rootNodeIds.has(edge.source) && rootNodeIds.has(edge.target),
  )
  const startNodes = rootNodes.filter((node) => node.type === BuiltinNodeType.START)
  const endNodes = rootNodes.filter((node) => node.type === BuiltinNodeType.END)

  if (startNodes.length !== 1) {
    report({
      scope: 'workflow',
      message: `根工作流必须且只能包含一个开始节点，当前数量：${startNodes.length}`,
    })
  }

  if (endNodes.length === 0) {
    report({
      scope: 'workflow',
      message: '根工作流至少需要一个结束节点',
    })
  }

  if (startNodes.length !== 1 || endNodes.length === 0) return

  const reachableFromStart = collectReachableNodeIds(
    [startNodes[0]!.id],
    createAdjacency(rootEdges),
  )
  const canReachEnd = collectReachableNodeIds(
    endNodes.map((node) => node.id),
    createAdjacency(rootEdges, true),
  )

  for (const node of rootNodes) {
    if (!reachableFromStart.has(node.id)) {
      report({
        scope: 'node',
        nodeId: node.id,
        message: '节点无法从开始节点到达',
      })
    }

    if (!canReachEnd.has(node.id)) {
      report({
        scope: 'node',
        nodeId: node.id,
        message: '节点无法到达任一结束节点',
      })
    }
  }
}
