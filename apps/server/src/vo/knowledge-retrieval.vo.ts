export interface KnowledgeRetrievalDocumentVo {
  chunkId: string
  documentId: string
  documentVersionId: string
  documentName: string
  sequence: number
  content: string
  metadata: Record<string, unknown>
  score: number
  bm25Rank?: number
  denseRank?: number
  bm25Score?: number
  denseScore?: number
  rrfRank?: number
  rrfScore?: number
  rerankScore?: number
}

export interface KnowledgeRetrievalVo {
  profile: 'HYBRID_ACCURATE' | 'HYBRID_FAST'
  profileVersion: string
  scoreType: 'rerank' | 'rrf'
  documents: KnowledgeRetrievalDocumentVo[]
}
