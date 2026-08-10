import type { ActionMenuAction } from '@/components/action-menu-content'

import type { DocumentAction, DocumentActionHandler, KnowledgeBaseDocument } from '../types'

export function getDocumentActions(
  document: KnowledgeBaseDocument,
  onDocumentAction?: DocumentActionHandler,
): ActionMenuAction[] {
  function createHandler(action: DocumentAction) {
    return () => onDocumentAction?.(action, document)
  }

  return [
    {
      id: 'reindex',
      label: '重新索引',
      onSelect: createHandler('reindex'),
    },
    {
      id: 'delete',
      label: '删除',
      destructive: true,
      separatorBefore: true,
      onSelect: createHandler('delete'),
    },
  ]
}
