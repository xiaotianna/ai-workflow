export const FIELD_UI_TYPES = {
  INPUT: 'input',
  TEXTAREA: 'textarea',
  SELECT: 'select',
  SWITCH: 'switch',
  SLIDER: 'slider',
  CODE_EDITOR: 'code_editor',
} as const

export type FieldUIType = (typeof FIELD_UI_TYPES)[keyof typeof FIELD_UI_TYPES]
