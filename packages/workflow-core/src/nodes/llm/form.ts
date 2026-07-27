import { FIELD_UI_TYPES } from '../../form/field-ui-constants'
import type { NodeFormSchema } from '../../form/field-schema-types'
import { llmNodeSchema } from './schema'

export const llmNodeForm = {
  prompt: {
    ui: FIELD_UI_TYPES.TEXTAREA,
    label: 'Prompt',
    description: '输入发送给模型的提示词',
    required: true,
  },
} satisfies NodeFormSchema<typeof llmNodeSchema>
