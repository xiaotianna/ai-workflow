export interface KnowledgeBaseVo {
  id: string
  title: string
  author: string
  description?: string
  icon?: string
  createdAt: Date
  updatedAt: Date
}

export interface KnowledgeBaseListVo {
  items: KnowledgeBaseVo[]
}

export interface KnowledgeBaseSettingsVo {
  segmentationMode: 'GENERAL' | 'QA' | 'PARENT_CHILD'
  maxSegmentLength: number
  overlapLength: number
  normalizeWhitespace: boolean
  segmentationRevision: number
  retrievalProfile: 'HYBRID_ACCURATE' | 'HYBRID_FAST'
  retrievalTopK: number
  staleDocumentCount: number
  updatedAt: Date
}

export interface KnowledgeDocumentVo {
  id: string
  knowledgeBaseId: string
  name: string
  fileType: string
  sourceMimeType: string
  sourceSize: string
  segmentationMode: 'GENERAL' | 'QA' | 'PARENT_CHILD'
  maxSegmentLength: number
  overlapLength: number
  normalizeWhitespace: boolean
  status: 'PROCESSING' | 'READY' | 'FAILED'
  enabled: boolean
  characterCount: number
  chunkCount: number
  needsReindex: boolean
  errorMessage?: string
  createdAt: Date
  updatedAt: Date
}

export interface KnowledgeDocumentListVo {
  items: KnowledgeDocumentVo[]
  total: number
  page: number
  pageSize: number
}

export interface KnowledgeChunkVo {
  id: string
  sequence: number
  content: string
  characterCount: number
  tokenCount: number
  metadata: Record<string, unknown>
  createdAt: Date
}

export interface KnowledgeChunkListVo {
  document: KnowledgeDocumentVo
  items: KnowledgeChunkVo[]
  total: number
  page: number
  pageSize: number
}

export interface KnowledgeDocumentPreviewVo {
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
