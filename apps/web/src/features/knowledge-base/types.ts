import type { KnowledgeBaseSort as ApiKnowledgeBaseSort } from '@/api/knowledge-bases'

import type { DocumentSegmentationMode } from './constants'

export interface KnowledgeBaseListItem {
  id: string
  title: string
  author: string
  createdAt: string
  updatedAt: string
  description?: string
  icon?: string
}

export type KnowledgeBaseSort = ApiKnowledgeBaseSort

export type KnowledgeBaseAction = 'edit' | 'delete'

export type KnowledgeBaseActionHandler = (
  action: KnowledgeBaseAction,
  knowledgeBase: KnowledgeBaseListItem,
) => void

export type DocumentStatus = 'available' | 'indexing' | 'error' | 'disabled' | 'stale'

export interface KnowledgeBaseDocument {
  id: string
  knowledgeBaseId: string
  name: string
  fileType: 'markdown' | 'pdf' | 'text' | 'other'
  segmentationMode: DocumentSegmentationMode
  characterCount: number
  recallCount: number
  uploadedAt: string
  uploadedAtLabel: string
  status: DocumentStatus
  statusLabel: string
  enabled: boolean
  chunkCount: number
  needsReindex: boolean
}

export type DocumentAction = 'rename' | 'delete' | 'reindex'

export type DocumentActionHandler = (
  action: DocumentAction,
  document: KnowledgeBaseDocument,
) => void

export interface DocumentPreview {
  files: Array<{
    name: string
    total: number
    truncated: boolean
    items: Array<{
      sequence: number
      content: string
      characterCount: number
      metadata: Record<string, string | number>
    }>
  }>
}
