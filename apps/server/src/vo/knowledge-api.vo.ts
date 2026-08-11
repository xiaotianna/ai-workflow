export interface KnowledgeApiOverviewVo {
  enabled: boolean
}

export interface KnowledgeApiKeyVo {
  id: string
  maskedKey: string
  scopes: string[]
  createdAt: Date
  lastUsedAt?: Date
}

export interface CreatedKnowledgeApiKeyVo extends KnowledgeApiKeyVo {
  key: string
}

export interface KnowledgeApiRetrieveResultVo {
  rank: number
  chunkId: string
  documentId: string
  documentName: string
  content: string
  metadata: Record<string, unknown>
  score: number
}

export interface KnowledgeApiRetrieveVo {
  requestId: string
  profile: {
    id: 'HYBRID_ACCURATE' | 'HYBRID_FAST'
    version: string
  }
  scoreType: 'rerank' | 'rrf'
  tookMs: number
  results: KnowledgeApiRetrieveResultVo[]
}
