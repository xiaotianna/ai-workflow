import type { NodeFormSchema } from '../../form/field-schema-types'
import { FIELD_UI_TYPES } from '../../form/field-ui-constants'
import { conditionNodeSchema } from './schema'

export const conditionNodeForm = {
  conditions: {
    ui: FIELD_UI_TYPES.CONDITION_BRANCHES,
    label: '分支条件',
    required: true,
  },
} satisfies NodeFormSchema<typeof conditionNodeSchema>
