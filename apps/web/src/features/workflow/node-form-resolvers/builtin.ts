import { BuiltinNodeType } from '@ai-workflow/core'
import type { KnowledgeBaseDto } from '@/api/knowledge-bases'

import { createRagNodeFormFieldsResolver } from './rag'
import type { NodeFormFieldsResolverRegistry } from './registry'

interface CreateBuiltinNodeFormFieldsResolversOptions {
  knowledgeBases: readonly Pick<KnowledgeBaseDto, 'id' | 'title'>[]
  knowledgeBasesLoading: boolean
  knowledgeBasesLoadError: boolean
  selectedKnowledgeBaseId?: string
}

export function createBuiltinNodeFormFieldsResolvers({
  knowledgeBases,
  knowledgeBasesLoading,
  knowledgeBasesLoadError,
  selectedKnowledgeBaseId,
}: CreateBuiltinNodeFormFieldsResolversOptions): NodeFormFieldsResolverRegistry {
  return {
    [BuiltinNodeType.RAG]: createRagNodeFormFieldsResolver(knowledgeBases, {
      loading: knowledgeBasesLoading,
      loadError: knowledgeBasesLoadError,
      selectedKnowledgeBaseId,
    }),
  }
}
