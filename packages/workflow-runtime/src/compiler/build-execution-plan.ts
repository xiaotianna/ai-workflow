import type { Workflow, WorkflowEdge } from '@ai-workflow/core'
import type { ExecutionPlan, StaticScopeKey } from './execution-plan'
import { appendMapValue } from '../utils/append-map-value'
import { freezeArrayMap } from '../utils/freeze-array-map'

// 将Workflow数据结构转为ExecutionPlan，具体作用看【ExecutionPlan】
export const buildExecutionPlan = (workflow: Workflow): ExecutionPlan => {
  const nodeById = new Map(workflow.nodes.map((node) => [node.id, node]))
  const incomingEdges = new Map<string, WorkflowEdge[]>()
  const outgoingEdges = new Map<string, WorkflowEdge[]>()
  const childrenByScope = new Map<StaticScopeKey, string[]>()
  const edgesByScope = new Map<StaticScopeKey, WorkflowEdge[]>()

  for (const node of workflow.nodes) {
    appendMapValue(childrenByScope, node.parentId ?? 'root', node.id)
  }

  for (const edge of workflow.edges) {
    appendMapValue(incomingEdges, edge.target, edge)
    appendMapValue(outgoingEdges, edge.source, edge)
    const sourceNode = nodeById.get(edge.source)!
    appendMapValue(edgesByScope, sourceNode.parentId ?? 'root', edge)
  }

  return {
    workflow,
    nodeById,
    incomingEdges: freezeArrayMap(incomingEdges),
    outgoingEdges: freezeArrayMap(outgoingEdges),
    childrenByScope: freezeArrayMap(childrenByScope),
    edgesByScope: freezeArrayMap(edgesByScope),
  }
}
