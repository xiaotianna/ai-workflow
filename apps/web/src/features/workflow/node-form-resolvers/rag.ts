import { FIELD_UI_TYPES } from '@ai-workflow/core'
import type { NodeConfigFieldMap } from '@ai-workflow/form/components/node-config-fields'
import type { KnowledgeBaseListItem } from '@/features/knowledge-base'

import type { NodeFormFieldsResolver } from './registry'

type KnowledgeBaseOptionSource = Pick<KnowledgeBaseListItem, 'id' | 'title'>

export function createRagNodeFormFieldsResolver(
  knowledgeBases: readonly KnowledgeBaseOptionSource[],
): NodeFormFieldsResolver {
  return (fields: NodeConfigFieldMap) => {
    const knowledgeBaseField = fields.knowledgeBaseId

    if (!knowledgeBaseField || knowledgeBaseField.ui !== FIELD_UI_TYPES.SELECT) {
      return fields
    }

    return {
      ...fields,
      knowledgeBaseId: {
        ...knowledgeBaseField,
        options: knowledgeBases.map((knowledgeBase) => ({
          label: knowledgeBase.title,
          value: knowledgeBase.id,
        })),
      },
    }
  }
}
