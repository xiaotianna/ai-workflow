import { registerUINode } from '../registry'
import type { WorkflowNodeUIComponent } from '../registry'
import { nodes, WorkflowNodeType } from '@ai-workflow/core'
import { ChatNodeUI } from './chat'
import { StartNodeUI } from './start'

export const renderNodeMap: Partial<Record<WorkflowNodeType, WorkflowNodeUIComponent>> = {
  [WorkflowNodeType.START]: StartNodeUI,
  [WorkflowNodeType.CHAT]: ChatNodeUI,
}

nodes.forEach((node) => {
  const renderer = renderNodeMap[node.definition.type as WorkflowNodeType]

  if (!renderer) {
    return
  }

  registerUINode(node.definition.type, renderer)
})
