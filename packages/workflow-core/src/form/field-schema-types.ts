import type { z } from 'zod'
import { FIELD_UI_TYPES, type FieldUIType } from './field-ui-constants'

export type FieldValue = string | number | boolean

export interface BaseFieldSchema {
  label: string
  description?: string
  required?: boolean
}

export interface TextFieldSchema extends BaseFieldSchema {
  ui: typeof FIELD_UI_TYPES.TEXT
}

export interface NumberFieldSchema extends BaseFieldSchema {
  ui: typeof FIELD_UI_TYPES.NUMBER
}

export interface TextareaFieldSchema extends BaseFieldSchema {
  ui: typeof FIELD_UI_TYPES.TEXTAREA
}

export interface SelectFieldSchema<TValue extends FieldValue = FieldValue> extends BaseFieldSchema {
  ui: typeof FIELD_UI_TYPES.SELECT
  options: ReadonlyArray<{
    label: string
    value: TValue
  }>
}

export interface SwitchFieldSchema extends BaseFieldSchema {
  ui: typeof FIELD_UI_TYPES.SWITCH
}

export interface SliderFieldSchema extends BaseFieldSchema {
  ui: typeof FIELD_UI_TYPES.SLIDER
  min?: number
  max?: number
  step?: number
}

export interface CodeEditorFieldSchema extends BaseFieldSchema {
  ui: typeof FIELD_UI_TYPES.CODE_EDITOR
  content: string
}

export interface KeyValueTableFieldSchema extends BaseFieldSchema {
  ui: typeof FIELD_UI_TYPES.KEY_VALUE_TABLE
}

export interface RequestBodyFieldSchema extends BaseFieldSchema {
  ui: typeof FIELD_UI_TYPES.REQUEST_BODY
}

export interface ConditionRulesFieldSchema extends BaseFieldSchema {
  ui: typeof FIELD_UI_TYPES.CONDITION_RULES
}

export interface ConditionBranchesFieldSchema extends BaseFieldSchema {
  ui: typeof FIELD_UI_TYPES.CONDITION_BRANCHES
}

export interface LlmModelFieldSchema extends BaseFieldSchema {
  ui: typeof FIELD_UI_TYPES.LLM_MODEL
}

export interface KnowledgeBaseFieldSchema extends BaseFieldSchema {
  ui: typeof FIELD_UI_TYPES.KNOWLEDGE_BASE
}

export interface ContextMessagesFieldSchema extends BaseFieldSchema {
  ui: typeof FIELD_UI_TYPES.CONTEXT_MESSAGES
}

export interface ErrorHandlingFieldSchema extends BaseFieldSchema {
  ui: typeof FIELD_UI_TYPES.ERROR_HANDLING
}

export interface FieldSchemaByUI {
  [FIELD_UI_TYPES.TEXT]: TextFieldSchema
  [FIELD_UI_TYPES.NUMBER]: NumberFieldSchema
  [FIELD_UI_TYPES.TEXTAREA]: TextareaFieldSchema
  [FIELD_UI_TYPES.SELECT]: SelectFieldSchema
  [FIELD_UI_TYPES.SWITCH]: SwitchFieldSchema
  [FIELD_UI_TYPES.SLIDER]: SliderFieldSchema
  [FIELD_UI_TYPES.CODE_EDITOR]: CodeEditorFieldSchema
  [FIELD_UI_TYPES.KEY_VALUE_TABLE]: KeyValueTableFieldSchema
  [FIELD_UI_TYPES.REQUEST_BODY]: RequestBodyFieldSchema
  [FIELD_UI_TYPES.CONDITION_RULES]: ConditionRulesFieldSchema
  [FIELD_UI_TYPES.CONDITION_BRANCHES]: ConditionBranchesFieldSchema
  [FIELD_UI_TYPES.LLM_MODEL]: LlmModelFieldSchema
  [FIELD_UI_TYPES.KNOWLEDGE_BASE]: KnowledgeBaseFieldSchema
  [FIELD_UI_TYPES.CONTEXT_MESSAGES]: ContextMessagesFieldSchema
  [FIELD_UI_TYPES.ERROR_HANDLING]: ErrorHandlingFieldSchema
}

export type FieldSchema<TUI extends FieldUIType = FieldUIType> = FieldSchemaByUI[TUI]

export type FieldSchemaMap<TConfig extends object> = {
  [K in keyof TConfig]-?: FieldSchema
}

export type NodeFormSchema<TSchema extends z.ZodType> =
  z.output<TSchema> extends object ? FieldSchemaMap<z.output<TSchema>> : never
