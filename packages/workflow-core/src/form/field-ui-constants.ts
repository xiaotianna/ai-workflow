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
  CONDITION_RULES: 'condition_rules',
  CONDITION_BRANCHES: 'condition_branches',
  LLM_MODEL: 'llm_model',
  KNOWLEDGE_BASE: 'knowledge_base',
  SUB_WORKFLOW: 'sub_workflow',
  CONTEXT_MESSAGES: 'context_messages',
  VARIABLE_TEMPLATE: 'variable_template',
  ERROR_HANDLING: 'error_handling',
} as const

export type FieldUIType = (typeof FIELD_UI_TYPES)[keyof typeof FIELD_UI_TYPES]
