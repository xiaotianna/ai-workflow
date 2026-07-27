import { FIELD_UI_TYPES } from '../../form/field-ui-constants'
import type { NodeFormSchema } from '../../form/field-schema-types'
import { codeNodeSchema } from './schema'

export const codeNodeForm = {
  code: {
    ui: FIELD_UI_TYPES.CODE_EDITOR,
    label: '代码',
    description: '输入节点需要执行的代码',
    required: true,
    language: 'javascript',
    content: '',
  },
} satisfies NodeFormSchema<typeof codeNodeSchema>
