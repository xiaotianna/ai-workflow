import type { NodeFormSchema } from '../../form/field-schema-types'
import { FIELD_UI_TYPES } from '../../form/field-ui-constants'
import { llmNodeSchema } from './schema'

export const llmNodeForm = {
  model: {
    ui: FIELD_UI_TYPES.LLM_MODEL,
    label: '模型',
    required: true,
  },
  messages: {
    ui: FIELD_UI_TYPES.CONTEXT_MESSAGES,
    label: '上下文',
    required: true,
  },
} satisfies NodeFormSchema<typeof llmNodeSchema>
