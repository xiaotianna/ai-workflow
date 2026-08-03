import { FIELD_UI_TYPES } from '../../form/field-ui-constants'
import type { NodeFormSchema } from '../../form/field-schema-types'
import { subWorkflowNodeSchema } from './schema'

export const subWorkflowNodeForm = {
  workflow: {
    ui: FIELD_UI_TYPES.SUB_WORKFLOW,
    label: '子工作流',
    description: '选择已发布的工作流，输入与公开输出会按发布版本自动同步',
    required: true,
  },
} satisfies NodeFormSchema<typeof subWorkflowNodeSchema>
