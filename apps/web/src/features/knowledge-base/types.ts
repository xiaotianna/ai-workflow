import type { KnowledgeBaseSort as ApiKnowledgeBaseSort } from '@/api/knowledge-bases'

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

export type DocumentSegmentationMode = 'general' | 'qa' | 'parent-child'

export type DocumentStatus = 'available' | 'indexing' | 'error' | 'disabled'

export interface KnowledgeBaseDocument {
  id: string
  knowledgeBaseId: string
  name: string
  fileType: 'markdown' | 'pdf' | 'text' | 'other'
  segmentationMode: DocumentSegmentationMode
  segmentationModeLabel: string
  characterCount: number
  recallCount: number
  uploadedAt: string
  uploadedAtLabel: string
  status: DocumentStatus
  statusLabel: string
  enabled: boolean
}

export type DocumentAction = 'rename' | 'delete' | 'reindex'

export type DocumentActionHandler = (
  action: DocumentAction,
  document: KnowledgeBaseDocument,
) => void
