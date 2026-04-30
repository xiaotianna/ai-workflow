import { registerUINode } from '../registry'
import type { WorkflowNodeUIComponent } from '../registry'
import { nodes, WorkflowNodeType } from '@ai-workflow/core'
import { ChatNodeUI } from './chat'

export * from './base'
export * from './chat'

const renderNode: Partial<Record<WorkflowNodeType, WorkflowNodeUIComponent>> = {
  [WorkflowNodeType.CHAT]: ChatNodeUI,
}

nodes.forEach((node) => {
  const renderer = renderNode[node.definition.type as WorkflowNodeType]

  if (!renderer) {
    return
  }

  registerUINode(node.definition.type, renderer)
})
