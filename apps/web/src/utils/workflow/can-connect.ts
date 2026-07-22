import type { WorkflowCanvasNode } from '@/components/workflow/types'
import {
  type WorkflowEdge,
  type Workflow,
  nodeRegistry,
  workflowSchema,
  validateWorkflow,
} from '@ai-workflow/core'
import type { Connection } from '@xyflow/react'

export function toWorkflow(
  baseWorkflow: Workflow,
  nodes: readonly WorkflowCanvasNode[],
  edges: readonly WorkflowEdge[],
): Workflow {
  return {
    ...baseWorkflow,
    nodes: nodes.map((node) => ({
      id: node.id,
      type: node.type,
      config: node.data,
    })),
    edges: [...edges],
  }
}

export function canConnect(
  connection: Connection | WorkflowEdge,
  baseWorkflow: Workflow,
  nodes: readonly WorkflowCanvasNode[],
  edges: readonly WorkflowEdge[],
): boolean {
  const { source, sourceHandle, target, targetHandle } = connection

  if (!sourceHandle || !targetHandle || source === target) return false

  const sourceNode = nodes.find((node) => node.id === source)
  const targetNode = nodes.find((node) => node.id === target)

  if (!sourceNode || !targetNode) return false

  const sourceType = nodeRegistry.get(sourceNode.type)
  const targetType = nodeRegistry.get(targetNode.type)

  if (!sourceType || !targetType) return false
  if (!sourceType.schema.safeParse(sourceNode.data).success) return false
  if (!targetType.schema.safeParse(targetNode.data).success) return false

  const candidateEdge: WorkflowEdge = {
    id: 'CANDIDATE_EDGE_ID',
    source,
    sourceHandle,
    target,
    targetHandle,
  }
  const candidateWorkflow = toWorkflow(baseWorkflow, nodes, [...edges, candidateEdge])
  const parsed = workflowSchema.safeParse(candidateWorkflow)

  if (!parsed.success) return false

  return !validateWorkflow(parsed.data, nodeRegistry).some(
    (issue) => issue.scope === 'edge' && issue.edgeId === 'CANDIDATE_EDGE_ID',
  )
}
