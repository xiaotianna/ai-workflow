import { nodeRegistry, type WorkflowNode } from '@ai-workflow/core'

export function getWorkflowNodeDisplayLabel({ type, label }: Pick<WorkflowNode, 'type' | 'label'>) {
  return label?.trim() || nodeRegistry.get(type)?.definition.label || type
}
