import { BookOpen } from 'lucide-react'

import { ResourceCard } from '@/components/card/resource-card'

import type { KnowledgeBaseActionHandler, KnowledgeBaseListItem } from '../types'
import { knowledgeBaseIconBackground } from '../constants'
import { getKnowledgeBaseActions } from './knowledge-base-actions'

interface KnowledgeBaseGridProps {
  knowledgeBases: KnowledgeBaseListItem[]
  onKnowledgeBaseAction?: KnowledgeBaseActionHandler
}

export function KnowledgeBaseGrid({
  knowledgeBases,
  onKnowledgeBaseAction,
}: KnowledgeBaseGridProps) {
  return (
    <div className="2k:grid-cols-6 relative grid grow grid-cols-1 content-start gap-2.5 pt-4 sm:grid-cols-1 md:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-5">
      {knowledgeBases.map((knowledgeBase) => {
        const actions = getKnowledgeBaseActions(knowledgeBase, onKnowledgeBaseAction)

        return (
          <ResourceCard
            key={knowledgeBase.id}
            title={knowledgeBase.title}
            kindLabel={knowledgeBase.kindLabel}
            author={knowledgeBase.author}
            editedAtLabel={knowledgeBase.editedAtLabel}
            description={knowledgeBase.description}
            icon={knowledgeBase.icon}
            iconBackground={knowledgeBaseIconBackground}
            badgeIcon={BookOpen}
            badgeLabel="知识库"
            to={`/knowledge-base/${encodeURIComponent(knowledgeBase.id)}/documents`}
            linkAriaLabel={`打开知识库 ${knowledgeBase.title}`}
            actions={actions}
          />
        )
      })}
    </div>
  )
}
