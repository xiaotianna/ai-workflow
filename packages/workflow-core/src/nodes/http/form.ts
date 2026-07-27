import { FIELD_UI_TYPES } from '../../form/field-ui-constants'
import type { NodeFormSchema } from '../../form/field-schema-types'
import { HTTP_METHODS } from './constant'
import { httpNodeSchema } from './schema'

export const httpNodeForm = {
  url: {
    ui: FIELD_UI_TYPES.TEXT,
    label: '请求地址',
    required: true,
  },
  method: {
    ui: FIELD_UI_TYPES.SELECT,
    label: '请求方法',
    required: true,
    options: HTTP_METHODS.map((method) => ({
      label: method,
      value: method,
    })),
  },
} satisfies NodeFormSchema<typeof httpNodeSchema>
