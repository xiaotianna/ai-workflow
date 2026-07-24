import type {
  WorkflowCanvasNode,
  WorkflowEditorSnapshot
} from '@/components/workflow/types'
import type { Workflow, WorkflowEdge, WorkflowNode } from '@ai-workflow/core'
import type { Viewport, XYPosition } from '@xyflow/react'

// 提供默认节点位置
export const getDefaultNodePosition = (index: number): XYPosition => {
  return {
    x: 120 + (index % 3) * 320,
    y: 120 + Math.floor(index / 3) * 220
  }
}

const getNodeDepth = (
  node: WorkflowNode,
  nodeById: ReadonlyMap<string, WorkflowNode>
): number => {
  let depth = 0
  let parentId = node.parentId
  const visited = new Set<string>()

  while (parentId && !visited.has(parentId)) {
    visited.add(parentId)
    depth += 1
    parentId = nodeById.get(parentId)?.parentId
  }

  return depth
}

// 将core的工作流数据转为画布需要的数据（添加坐标）
export const toCanvasNodes = (
  snapshot: WorkflowEditorSnapshot
): WorkflowCanvasNode[] => {
  return snapshot.workflow.nodes.map((workflowNode, index) => ({
    id: workflowNode.id,
    type: workflowNode.type,
    position:
      snapshot.layout.positions[workflowNode.id] ??
      getDefaultNodePosition(index),
    data: workflowNode.config
  }))
}

// 把画布数据转为core中节点数据（去掉坐标，node->node）
export const toWorkflowNode = (node: WorkflowCanvasNode): WorkflowNode => {
  return {
    id: node.id,
    type: node.type,
    config: node.data
  }
}

/**
 * 将画布内容转为core的workflowType
 * 应用场景：例如“保存”
 * 当初始化的时候还在的旧节点：baseWorkflow.nodes，新增了node，但是这个node是画布的数据结构，需要转换
 */
export const toWorkflow = (
  baseWorkflow: Workflow,
  nodes: readonly WorkflowCanvasNode[],
  edges: readonly WorkflowEdge[]
) => {
  return {
    ...baseWorkflow,
    nodes: nodes.map(toWorkflowNode),
    edges: [...edges]
  }
}

// 取工作流编辑器数据中的layout字段
export const toWorkflowEditorLayout = (
  nodes: readonly WorkflowCanvasNode[],
  viewport: Viewport | undefined
): WorkflowEditorSnapshot['layout'] => {
  return {
    positions: Object.fromEntries(
      nodes.map((node) => [node.id, node.position])
    ),
    ...(viewport ? { viewport } : {})
  }
}
