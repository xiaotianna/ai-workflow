export const FIELD_UI_TYPES = {
  TEXT: 'text',
  NUMBER: 'number',
  TEXTAREA: 'textarea',
  SELECT: 'select',
  SWITCH: 'switch',
  SLIDER: 'slider',
  CODE_EDITOR: 'code_editor',
  KEY_VALUE_TABLE: 'key_value_table',
  REQUEST_BODY: 'request_body',
  CONDITION_BRANCHES: 'condition_branches',
} as const

export type FieldUIType = (typeof FIELD_UI_TYPES)[keyof typeof FIELD_UI_TYPES]
