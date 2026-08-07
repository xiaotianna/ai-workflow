import type { NodeRegistryReader, WorkflowNode } from '@ai-workflow/core'

export function getWorkflowNodeDisplayLabel(
  { type, label }: Pick<WorkflowNode, 'type' | 'label'>,
  nodeRegistry: NodeRegistryReader,
) {
  return label?.trim() || nodeRegistry.get(type)?.definition.label || type
}
