export interface KnowledgeRetrievalDocumentVo {
  chunkId: string
  documentId: string
  documentVersionId: string
  documentName: string
  sequence: number
  content: string
  metadata: Record<string, unknown>
  score: number
}

export interface KnowledgeRetrievalVo {
  documents: KnowledgeRetrievalDocumentVo[]
}
