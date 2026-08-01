import { FIELD_UI_TYPES } from '../../form/field-ui-constants'
import type { NodeFormSchema } from '../../form/field-schema-types'
import { ragNodeSchema } from './schema'

export const ragNodeForm = {
  knowledgeBaseId: {
    ui: FIELD_UI_TYPES.KNOWLEDGE_BASE,
    label: '知识库',
    description: '选择需要检索的知识库',
    required: true,
  },
} satisfies NodeFormSchema<typeof ragNodeSchema>
