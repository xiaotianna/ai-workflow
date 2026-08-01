import { FIELD_UI_TYPES } from '../../form/field-ui-constants'
import type { NodeFormSchema } from '../../form/field-schema-types'
import { ragNodeSchema } from './schema'

export const ragNodeForm = {
  knowledgeBases: {
    ui: FIELD_UI_TYPES.KNOWLEDGE_BASE,
    label: '知识库',
    description: '选择需要检索的一个或多个知识库',
    required: true,
  },
  topK: {
    ui: FIELD_UI_TYPES.SLIDER,
    label: '召回设置',
    description: '设置检索时返回的最大结果数量，范围为 1 到 20',
    required: true,
    min: 1,
    max: 20,
    step: 1,
  },
} satisfies NodeFormSchema<typeof ragNodeSchema>
