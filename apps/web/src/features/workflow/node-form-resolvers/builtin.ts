import { BuiltinNodeType } from '@ai-workflow/core'
import { initialKnowledgeBases } from '@/features/knowledge-base'

import { createRagNodeFormFieldsResolver } from './rag'
import type { NodeFormFieldsResolverRegistry } from './registry'

export const builtinNodeFormFieldsResolvers = {
  [BuiltinNodeType.RAG]: createRagNodeFormFieldsResolver(initialKnowledgeBases),
} satisfies NodeFormFieldsResolverRegistry
