import { ragNode, type RagNodeConfig } from '@ai-workflow/core'

import { NodeContentList } from '../../components/base-node'
import { KnowledgeBaseReferenceIcon } from '../../components/knowledge-base-reference-icon'
import { NodeContentItem } from '../../components/node-content-item'
import type { NodeContentProps } from '../../contracts/node-content'

export function RagNodeContent({ node }: NodeContentProps<RagNodeConfig>) {
  const knowledgeBases = node.config.knowledgeBases
  const knowledgeBaseField = ragNode.form.knowledgeBases

  if (knowledgeBases.length === 0) {
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
      {knowledgeBases.map((knowledgeBase) => {
        let content = <p className="text-xs leading-4">已配置知识库（待刷新展示信息）</p>

        if (knowledgeBase.title) {
          content = (
            <div className="flex min-w-0 items-center gap-1.5">
              <KnowledgeBaseReferenceIcon
                icon={knowledgeBase.icon}
                title={knowledgeBase.title}
                size="compact"
              />
              <span
                title={knowledgeBase.title}
                className="text-foreground/80 min-w-0 flex-1 truncate text-xs leading-4 font-medium"
              >
                {knowledgeBase.title}
              </span>
            </div>
          )
        }

        return <NodeContentItem key={knowledgeBase.id} content={content} />
      })}
    </NodeContentList>
  )
}
