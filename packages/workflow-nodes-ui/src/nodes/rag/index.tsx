import { ragNode, type RagNodeConfig } from '@ai-workflow/core'

import { NodeContentList } from '../../components/base-node'
import { NodeContentItem } from '../../components/node-content-item'
import type { NodeContentProps } from '../../contracts/node-content'

export function RagNodeContent({ node }: NodeContentProps<RagNodeConfig>) {
  const knowledgeBaseId = node.config.knowledgeBaseId
  const knowledgeBaseField = ragNode.form.knowledgeBaseId
  const knowledgeBaseContent = knowledgeBaseId || knowledgeBaseField.description

  return (
    <NodeContentList>
      <NodeContentItem
        content={
          <div className="flex min-w-0 items-center justify-between gap-2 text-xs leading-4">
            <span className="shrink-0">{knowledgeBaseField.label}</span>
            <span title={knowledgeBaseContent} className="min-w-0 truncate font-medium">
              {knowledgeBaseContent}
            </span>
          </div>
        }
      />
    </NodeContentList>
  )
}
