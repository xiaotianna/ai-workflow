import type { Request } from 'express'

export interface KnowledgeApiAuthContext {
  apiKeyId: string
  knowledgeBaseId: string
  ownerId: string
  defaultTopK: number
  scopes: readonly string[]
}

export interface KnowledgeApiAuthenticatedRequest extends Request {
  knowledgeApiAuth: KnowledgeApiAuthContext
}
