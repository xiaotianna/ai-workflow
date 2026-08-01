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
