import type { WorkflowCanvasNode, WorkflowEditorSnapshot } from '@/components/workflow/types'

// 将工作流节点数据转为画布需要的数据
export function toCanvasNodes(snapshot: WorkflowEditorSnapshot): WorkflowCanvasNode[] {
  return snapshot.workflow.nodes.map((workflowNode, index) => ({
    id: workflowNode.id,
    type: workflowNode.type,
    position: snapshot.layout.positions![workflowNode.id] ?? {
      x: 120 + (index % 3) * 320,
      y: 120 + Math.floor(index / 3) * 220,
    },
    data: workflowNode.config,
  }))
}
