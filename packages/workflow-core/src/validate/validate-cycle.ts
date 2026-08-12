import type { WorkflowEdge } from '../edge/workflow-edge-schema'
import type { ReportValidationIssueFn } from './validate-types'

// 判断给定拓扑中是否存在有向环
// 使用迭代式 Kahn 拓扑排序，避免递归 DFS 在大型工作流中造成调用栈溢出
const hasCycle = (nodeIds: Iterable<string>, edges: readonly WorkflowEdge[]): boolean => {
  const graph = new Map<string, string[]>(),
    indegrees = new Map<string, number>()

  for (const nodeId of nodeIds) {
    graph.set(nodeId, [])
    indegrees.set(nodeId, 0)
  }

  for (const edge of edges) {
    graph.get(edge.source)!.push(edge.target)
    indegrees.set(edge.target, indegrees.get(edge.target)! + 1)
  }

  const queue: string[] = []
  let cursor = 0,
    visitedCount = 0

  for (const [nodeId, indegree] of indegrees) {
    if (indegree === 0) {
      queue.push(nodeId)
    }
  }

  while (cursor < queue.length) {
    const nodeId = queue[cursor++]!
    visitedCount += 1

    for (const targetId of graph.get(nodeId)!) {
      const nextIndegree = indegrees.get(targetId)! - 1
      indegrees.set(targetId, nextIndegree)

      if (nextIndegree === 0) {
        queue.push(targetId)
      }
    }
  }

  return visitedCount !== graph.size
}

// 校验工作流不存在循环依赖
export const validateAcyclicWorkflow = (
  nodeIds: Iterable<string>,
  edges: readonly WorkflowEdge[],
  report: ReportValidationIssueFn,
): void => {
  if (hasCycle(nodeIds, edges)) {
    report({
      scope: 'workflow',
      message: '工作流中存在循环依赖',
    })
  }
}
