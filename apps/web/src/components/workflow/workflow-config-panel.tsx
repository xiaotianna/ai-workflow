import type { WorkflowNode } from '@ai-workflow/core'
import { WorkflowConfigForm } from './workflow-config-form'

interface WorkflowConfigPanelProps {
  node?: WorkflowNode
  onApply: (node: WorkflowNode) => void
}

export const WorkflowConfigPanel = (props: WorkflowConfigPanelProps) => {
  const { node, onApply } = props
  if (!node) {
    return <p className="text-muted-foreground text-sm">请选择一个节点查看配置</p>
  }
  return <WorkflowConfigForm key={node.id} node={node} onApply={onApply} />
}
