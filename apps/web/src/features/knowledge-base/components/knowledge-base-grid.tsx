import { Button } from '@ai-workflow/ui/components/button'
import { BookOpen } from 'lucide-react'

import { ResourceCard } from '@/components/card/resource-card'
import { ResourceCardSkeletonGrid } from '@/components/card/resource-card-skeleton'

import { getKnowledgeBaseTimeDisplay } from '../knowledge-base-sort-strategies'
import type { KnowledgeBaseActionHandler, KnowledgeBaseListItem, KnowledgeBaseSort } from '../types'
import { knowledgeBaseIconBackground, knowledgeSegmentationModeLabels } from '../constants'
import { getKnowledgeBaseActions } from './knowledge-base-actions'

interface KnowledgeBaseGridProps {
  knowledgeBases: KnowledgeBaseListItem[]
  error: boolean
  loading: boolean
  sort: KnowledgeBaseSort
  onRetry: () => void
  onKnowledgeBaseAction: KnowledgeBaseActionHandler
}

export function KnowledgeBaseGrid({
  knowledgeBases,
  error,
  loading,
  sort,
  onRetry,
  onKnowledgeBaseAction,
}: KnowledgeBaseGridProps) {
  if (loading) {
    return (
      <div
        className="2k:grid-cols-6 grid grid-cols-1 content-start gap-2.5 pt-4 sm:grid-cols-1 md:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-5"
        role="status"
        aria-label="正在加载知识库"
      >
        <ResourceCardSkeletonGrid count={6} />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex min-h-48 flex-col items-center justify-center gap-3">
        <p className="text-muted-foreground text-sm">知识库加载失败</p>
        <Button type="button" variant="secondary" size="sm" onClick={onRetry}>
          重新加载
        </Button>
      </div>
    )
  }

  if (knowledgeBases.length === 0) {
    return (
      <div className="text-muted-foreground flex min-h-48 items-center justify-center text-sm">
        暂无知识库
      </div>
    )
  }

  return (
    <div className="2k:grid-cols-6 relative grid grow grid-cols-1 content-start gap-2.5 pt-4 sm:grid-cols-1 md:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-5">
      {knowledgeBases.map((knowledgeBase) => {
        const actions = getKnowledgeBaseActions(knowledgeBase, onKnowledgeBaseAction),
          timeDisplay = getKnowledgeBaseTimeDisplay(knowledgeBase, sort)

        return (
          <ResourceCard
            key={knowledgeBase.id}
            title={knowledgeBase.title}
            kindLabel={knowledgeSegmentationModeLabels[knowledgeBase.segmentationMode]}
            author={knowledgeBase.author}
            timeLabel={timeDisplay.label}
            timeValue={timeDisplay.value}
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
