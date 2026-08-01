import type { ActionMenuAction } from '@/components/action-menu-content'

import type { KnowledgeBaseActionHandler, KnowledgeBaseListItem } from '../types'

export function getKnowledgeBaseActions(
  knowledgeBase: KnowledgeBaseListItem,
  onKnowledgeBaseAction: KnowledgeBaseActionHandler,
): readonly ActionMenuAction[] {
  return [
    {
      id: 'edit',
      label: '编辑信息',
      onSelect: () => onKnowledgeBaseAction('edit', knowledgeBase),
    },
    {
      id: 'delete',
      label: '删除',
      destructive: true,
      separatorBefore: true,
      onSelect: () => onKnowledgeBaseAction('delete', knowledgeBase),
    },
  ]
}
