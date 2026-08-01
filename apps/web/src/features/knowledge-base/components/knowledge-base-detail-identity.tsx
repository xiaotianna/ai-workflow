import { ResourceIdentity } from '@/components/resource-identity'

import { knowledgeBaseIconBackground } from '../constants'
import type { KnowledgeBaseActionHandler, KnowledgeBaseListItem } from '../types'
import { getKnowledgeBaseActions } from './knowledge-base-actions'
import { KnowledgeBaseActionMenu } from './knowledge-base-action-menu'

interface KnowledgeBaseDetailIdentityProps {
  knowledgeBase?: KnowledgeBaseListItem
  onKnowledgeBaseAction: KnowledgeBaseActionHandler
}

export function KnowledgeBaseDetailIdentity({
  knowledgeBase,
  onKnowledgeBaseAction,
}: KnowledgeBaseDetailIdentityProps) {
  const title = knowledgeBase?.title ?? '未命名知识库'
  const kindLabel = knowledgeBase ? '空白知识库' : '知识库'
  const actions = knowledgeBase ? getKnowledgeBaseActions(knowledgeBase, onKnowledgeBaseAction) : []

  return (
    <ResourceIdentity
      title={title}
      kindLabel={kindLabel}
      icon={<span aria-hidden>{knowledgeBase?.icon ?? '📖'}</span>}
      iconBackground={knowledgeBaseIconBackground}
      actions={<KnowledgeBaseActionMenu title={title} actions={actions} />}
    />
  )
}
