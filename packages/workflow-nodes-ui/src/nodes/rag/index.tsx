import { ragNode, type RagNodeConfig } from '@ai-workflow/core'

import { NodeContentList } from '../../components/base-node'
import { KnowledgeBaseReferenceIcon } from '../../components/knowledge-base-reference-icon'
import { NodeContentItem } from '../../components/node-content-item'
import type { NodeContentProps } from '../../contracts/node-content'

export function RagNodeContent({
  node,
  resolveKnowledgeBaseReferenceDisplay,
}: NodeContentProps<RagNodeConfig>) {
  const knowledgeBaseIds = node.config.knowledgeBaseIds
  const knowledgeBaseField = ragNode.form.knowledgeBaseIds

  if (knowledgeBaseIds.length === 0) {
    return (
      <NodeContentList>
        <NodeContentItem
          content={<p className="text-xs leading-4">{knowledgeBaseField.description}</p>}
        />
      </NodeContentList>
    )
  }

  return (
    <NodeContentList>
      {knowledgeBaseIds.map((knowledgeBaseId) => {
        const knowledgeBaseDisplay = resolveKnowledgeBaseReferenceDisplay?.(knowledgeBaseId)

        let content = <p className="text-xs leading-4">正在加载知识库信息...</p>

        if (resolveKnowledgeBaseReferenceDisplay && !knowledgeBaseDisplay) {
          content = <p className="text-xs leading-4">已配置知识库不可用</p>
        } else if (knowledgeBaseDisplay) {
          content = (
            <div className="flex min-w-0 items-center gap-1.5">
              <KnowledgeBaseReferenceIcon
                icon={knowledgeBaseDisplay.icon}
                title={knowledgeBaseDisplay.title}
                size="compact"
              />
              <span
                title={knowledgeBaseDisplay.title}
                className="text-foreground/80 min-w-0 flex-1 truncate text-xs leading-4 font-medium"
              >
                {knowledgeBaseDisplay.title}
              </span>
            </div>
          )
        }

        return <NodeContentItem key={knowledgeBaseId} content={content} />
      })}
    </NodeContentList>
  )
}
