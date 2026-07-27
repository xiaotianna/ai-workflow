import { FIELD_UI_TYPES } from '../../form/field-ui-constants'
import type { NodeFormSchema } from '../../form/field-schema-types'
import { loopNodeSchema } from './schema'

export const loopNodeForm = {
  maxIterations: {
    ui: FIELD_UI_TYPES.NUMBER,
    label: '最大循环次数',
    description: '允许执行的最大循环次数，范围为 1 到 10000',
    required: true,
  },
} satisfies NodeFormSchema<typeof loopNodeSchema>
