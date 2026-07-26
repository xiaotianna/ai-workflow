import { useParams } from 'react-router-dom'

import { DetailLayout } from '@/components/detail-layout'
import {
  initialKnowledgeBases,
  KnowledgeBaseDetailIdentity,
  type KnowledgeBaseActionHandler,
} from '@/features/knowledge-base'
import { routes } from '@/router'
import { getNavigationItemsFromRoute } from '@/router/navigation'

export interface KnowledgeBaseDetailPageProps {
  onKnowledgeBaseAction?: KnowledgeBaseActionHandler
}

export default function KnowledgeBaseDetailPage({
  onKnowledgeBaseAction,
}: KnowledgeBaseDetailPageProps) {
  const { id } = useParams<{ id: string }>()
  const knowledgeBase = initialKnowledgeBases.find((item) => item.id === id)
  const encodedKnowledgeBaseId = encodeURIComponent(id ?? '')

  return (
    <DetailLayout
      backTo="/knowledge-base"
      backLabel="知识库"
      resourceIdentity={
        <KnowledgeBaseDetailIdentity
          knowledgeBase={knowledgeBase}
          onKnowledgeBaseAction={onKnowledgeBaseAction}
        />
      }
      navigationItems={getNavigationItemsFromRoute(
        routes,
        'knowledge-base-detail',
        `/knowledge-base/${encodedKnowledgeBaseId}`,
      )}
      navigationLabel="知识库导航"
    />
  )
}
