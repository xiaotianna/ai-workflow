import { subWorkflowNode, type SubWorkflowNodeConfig } from '@ai-workflow/core'

import { NodeContentList } from '../../components/base-node'
import { NodeContentItem } from '../../components/node-content-item'
import { WorkflowReferenceIcon } from '../../components/workflow-reference-icon'
import type { NodeContentProps } from '../../contracts/node-content'

export function SubWorkflowNodeContent({ node }: NodeContentProps<SubWorkflowNodeConfig>) {
  const workflow = node.config.workflow
  const workflowField = subWorkflowNode.form.workflow
  const hasWorkflowReference = Boolean(workflow.id || workflow.appId)

  if (!hasWorkflowReference) {
    return (
      <NodeContentList>
        <NodeContentItem
          content={<p className="text-xs leading-4">{workflowField.description}</p>}
        />
      </NodeContentList>
    )
  }

  let content = <p className="text-xs leading-4">已配置子工作流（待刷新展示信息）</p>

  if (workflow.name) {
    content = (
      <div className="flex min-w-0 items-center gap-1.5">
        <WorkflowReferenceIcon icon={workflow.icon} title={workflow.name} size="compact" />
        <span
          title={workflow.name}
          className="text-foreground/80 min-w-0 flex-1 truncate text-xs leading-4 font-medium"
        >
          {workflow.name}
        </span>
      </div>
    )
  }

  return (
    <NodeContentList>
      <NodeContentItem content={content} />
    </NodeContentList>
  )
}
