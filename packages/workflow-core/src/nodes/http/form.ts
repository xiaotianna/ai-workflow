import type { NodeFormSchema } from '../../form/field-schema-types'
import { FIELD_UI_TYPES } from '../../form/field-ui-constants'
import { HTTP_METHODS } from './constant'
import { httpNodeSchema } from './schema'

export const httpNodeForm = {
  url: {
    ui: FIELD_UI_TYPES.TEXT,
    label: '请求地址',
    description: '请输入完整的 HTTP 或 HTTPS 地址。',
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
  headers: {
    ui: FIELD_UI_TYPES.KEY_VALUE_TABLE,
    label: 'Headers',
  },
  params: {
    ui: FIELD_UI_TYPES.KEY_VALUE_TABLE,
    label: 'Params',
  },
  body: {
    ui: FIELD_UI_TYPES.REQUEST_BODY,
    label: 'Body',
    required: true,
  },
  connectionTimeout: {
    ui: FIELD_UI_TYPES.NUMBER,
    label: '连接超时',
    description: '输入连接超时（以秒为单位）',
    required: true,
  },
  errorHandling: {
    ui: FIELD_UI_TYPES.ERROR_HANDLING,
    label: '异常处理',
    required: true,
  },
} satisfies NodeFormSchema<typeof httpNodeSchema>
