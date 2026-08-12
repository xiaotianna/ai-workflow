import type { FieldValue } from '@ai-workflow/core'
import { z } from 'zod'

export const PLUGIN_FIELD_UI_TYPES = {
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
  CONTEXT_MESSAGES: 'context_messages',
  ERROR_HANDLING: 'error_handling',
} as const

export type PluginBuiltinFieldUIType =
  (typeof PLUGIN_FIELD_UI_TYPES)[keyof typeof PLUGIN_FIELD_UI_TYPES]

export interface PluginBaseFieldSchema<TUI extends string = string> {
  readonly ui: TUI
  readonly label: string
  readonly description?: string
  readonly required?: boolean
}

export type PluginTextFieldSchema = PluginBaseFieldSchema<typeof PLUGIN_FIELD_UI_TYPES.TEXT>
export type PluginNumberFieldSchema = PluginBaseFieldSchema<typeof PLUGIN_FIELD_UI_TYPES.NUMBER>
export type PluginTextareaFieldSchema = PluginBaseFieldSchema<typeof PLUGIN_FIELD_UI_TYPES.TEXTAREA>
export type PluginSwitchFieldSchema = PluginBaseFieldSchema<typeof PLUGIN_FIELD_UI_TYPES.SWITCH>

export interface PluginSelectFieldSchema<
  TValue extends FieldValue = FieldValue,
> extends PluginBaseFieldSchema<typeof PLUGIN_FIELD_UI_TYPES.SELECT> {
  readonly options: ReadonlyArray<{ readonly label: string; readonly value: TValue }>
}

export interface PluginSliderFieldSchema extends PluginBaseFieldSchema<
  typeof PLUGIN_FIELD_UI_TYPES.SLIDER
> {
  readonly min?: number
  readonly max?: number
  readonly step?: number
}

export interface PluginCodeEditorFieldSchema extends PluginBaseFieldSchema<
  typeof PLUGIN_FIELD_UI_TYPES.CODE_EDITOR
> {
  readonly content: string
}

export type PluginKeyValueTableFieldSchema = PluginBaseFieldSchema<
  typeof PLUGIN_FIELD_UI_TYPES.KEY_VALUE_TABLE
>
export type PluginRequestBodyFieldSchema = PluginBaseFieldSchema<
  typeof PLUGIN_FIELD_UI_TYPES.REQUEST_BODY
>
export type PluginConditionRulesFieldSchema = PluginBaseFieldSchema<
  typeof PLUGIN_FIELD_UI_TYPES.CONDITION_RULES
>
export type PluginConditionBranchesFieldSchema = PluginBaseFieldSchema<
  typeof PLUGIN_FIELD_UI_TYPES.CONDITION_BRANCHES
>
export type PluginContextMessagesFieldSchema = PluginBaseFieldSchema<
  typeof PLUGIN_FIELD_UI_TYPES.CONTEXT_MESSAGES
>
export type PluginErrorHandlingFieldSchema = PluginBaseFieldSchema<
  typeof PLUGIN_FIELD_UI_TYPES.ERROR_HANDLING
>

export interface PluginHostFieldSchema<
  TType extends string = string,
> extends PluginBaseFieldSchema<TType> {
  readonly host: true
}

export type PluginFieldSchema =
  | PluginTextFieldSchema
  | PluginNumberFieldSchema
  | PluginTextareaFieldSchema
  | PluginSelectFieldSchema
  | PluginSwitchFieldSchema
  | PluginSliderFieldSchema
  | PluginCodeEditorFieldSchema
  | PluginKeyValueTableFieldSchema
  | PluginRequestBodyFieldSchema
  | PluginConditionRulesFieldSchema
  | PluginConditionBranchesFieldSchema
  | PluginContextMessagesFieldSchema
  | PluginErrorHandlingFieldSchema
  | PluginHostFieldSchema

type PluginFieldBaseOptions = Omit<PluginBaseFieldSchema, 'ui'>

function text(options: PluginFieldBaseOptions): PluginTextFieldSchema {
  return { ui: PLUGIN_FIELD_UI_TYPES.TEXT, ...options }
}

function number(options: PluginFieldBaseOptions): PluginNumberFieldSchema {
  return { ui: PLUGIN_FIELD_UI_TYPES.NUMBER, ...options }
}

function textarea(options: PluginFieldBaseOptions): PluginTextareaFieldSchema {
  return { ui: PLUGIN_FIELD_UI_TYPES.TEXTAREA, ...options }
}

function select<const TValue extends FieldValue>(
  options: PluginFieldBaseOptions & {
    readonly options: ReadonlyArray<{ readonly label: string; readonly value: TValue }>
  },
): PluginSelectFieldSchema<TValue> {
  return { ui: PLUGIN_FIELD_UI_TYPES.SELECT, ...options }
}

function switchField(options: PluginFieldBaseOptions): PluginSwitchFieldSchema {
  return { ui: PLUGIN_FIELD_UI_TYPES.SWITCH, ...options }
}

function slider(
  options: PluginFieldBaseOptions & Pick<PluginSliderFieldSchema, 'min' | 'max' | 'step'>,
): PluginSliderFieldSchema {
  return { ui: PLUGIN_FIELD_UI_TYPES.SLIDER, ...options }
}

function codeEditor(
  options: PluginFieldBaseOptions & { readonly content?: string },
): PluginCodeEditorFieldSchema {
  return { ui: PLUGIN_FIELD_UI_TYPES.CODE_EDITOR, content: '', ...options }
}

function keyValueTable(options: PluginFieldBaseOptions): PluginKeyValueTableFieldSchema {
  return { ui: PLUGIN_FIELD_UI_TYPES.KEY_VALUE_TABLE, ...options }
}

function requestBody(options: PluginFieldBaseOptions): PluginRequestBodyFieldSchema {
  return { ui: PLUGIN_FIELD_UI_TYPES.REQUEST_BODY, ...options }
}

function conditionRules(options: PluginFieldBaseOptions): PluginConditionRulesFieldSchema {
  return { ui: PLUGIN_FIELD_UI_TYPES.CONDITION_RULES, ...options }
}

function conditionBranches(options: PluginFieldBaseOptions): PluginConditionBranchesFieldSchema {
  return { ui: PLUGIN_FIELD_UI_TYPES.CONDITION_BRANCHES, ...options }
}

function contextMessages(options: PluginFieldBaseOptions): PluginContextMessagesFieldSchema {
  return { ui: PLUGIN_FIELD_UI_TYPES.CONTEXT_MESSAGES, ...options }
}

function errorHandling(options: PluginFieldBaseOptions): PluginErrorHandlingFieldSchema {
  return { ui: PLUGIN_FIELD_UI_TYPES.ERROR_HANDLING, ...options }
}

function host<const TType extends string>(
  options: PluginFieldBaseOptions & { readonly type: TType },
): PluginHostFieldSchema<TType> {
  const { type, ...fieldOptions } = options
  return { ui: type, host: true, ...fieldOptions }
}

export const field = {
  text,
  number,
  textarea,
  select,
  switch: switchField,
  slider,
  codeEditor,
  keyValueTable,
  requestBody,
  conditionRules,
  conditionBranches,
  contextMessages,
  errorHandling,
  host,
} as const

const baseFieldShape = {
    label: z.string().trim().min(1),
    description: z.string().trim().optional(),
    required: z.boolean().optional(),
  },
  pluginFieldValueSchema = z.union([z.string(), z.number().finite(), z.boolean()]),
  pluginBuiltinFieldUITypes = new Set<string>(Object.values(PLUGIN_FIELD_UI_TYPES))

export const pluginFieldSchema: z.ZodType<PluginFieldSchema> = z.union([
  z.object({ ui: z.literal('text'), ...baseFieldShape }).strict(),
  z.object({ ui: z.literal('number'), ...baseFieldShape }).strict(),
  z.object({ ui: z.literal('textarea'), ...baseFieldShape }).strict(),
  z
    .object({
      ui: z.literal('select'),
      ...baseFieldShape,
      options: z
        .array(
          z.object({ label: z.string().trim().min(1), value: pluginFieldValueSchema }).strict(),
        )
        .min(1),
    })
    .strict(),
  z.object({ ui: z.literal('switch'), ...baseFieldShape }).strict(),
  z
    .object({
      ui: z.literal('slider'),
      ...baseFieldShape,
      min: z.number().finite().optional(),
      max: z.number().finite().optional(),
      step: z.number().finite().positive().optional(),
    })
    .strict()
    .superRefine((schema, context) => {
      if (schema.min !== undefined && schema.max !== undefined && schema.min > schema.max) {
        context.addIssue({ code: 'custom', path: ['max'], message: 'max 不能小于 min' })
      }
    }),
  z
    .object({
      ui: z.literal('code_editor'),
      ...baseFieldShape,
      content: z.string(),
    })
    .strict(),
  z.object({ ui: z.literal('key_value_table'), ...baseFieldShape }).strict(),
  z.object({ ui: z.literal('request_body'), ...baseFieldShape }).strict(),
  z.object({ ui: z.literal('condition_rules'), ...baseFieldShape }).strict(),
  z.object({ ui: z.literal('condition_branches'), ...baseFieldShape }).strict(),
  z.object({ ui: z.literal('context_messages'), ...baseFieldShape }).strict(),
  z.object({ ui: z.literal('error_handling'), ...baseFieldShape }).strict(),
  z
    .object({
      ui: z
        .string()
        .trim()
        .min(1)
        .refine((ui) => !pluginBuiltinFieldUITypes.has(ui), '宿主字段类型不能占用内置字段类型'),
      host: z.literal(true),
      ...baseFieldShape,
    })
    .strict(),
])
