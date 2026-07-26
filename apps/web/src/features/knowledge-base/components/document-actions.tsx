import { Pencil, RefreshCw, Trash2 } from 'lucide-react'

import type { ActionMenuAction } from '@/components/action-menu-content'

import type { DocumentAction, DocumentActionHandler, KnowledgeBaseDocument } from '../types'

export function getDocumentActions(
  document: KnowledgeBaseDocument,
  onDocumentAction?: DocumentActionHandler,
): ActionMenuAction[] {
  if (!onDocumentAction) return []

  function createHandler(action: DocumentAction) {
    return () => onDocumentAction!(action, document)
  }

  return [
    {
      id: 'rename',
      label: '重命名',
      icon: <Pencil aria-hidden className="text-muted-foreground size-4" />,
      onSelect: createHandler('rename'),
    },
    {
      id: 'reindex',
      label: '重新索引',
      icon: <RefreshCw aria-hidden className="text-muted-foreground size-4" />,
      onSelect: createHandler('reindex'),
    },
    {
      id: 'delete',
      label: '删除',
      icon: <Trash2 aria-hidden className="size-4" />,
      destructive: true,
      separatorBefore: true,
      onSelect: createHandler('delete'),
    },
  ]
}
