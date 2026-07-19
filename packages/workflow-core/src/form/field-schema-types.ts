import { FIELD_UI_TYPES } from './field-ui-constants'

// 基础字段
export interface BaseFieldSchema<TValue> {
  label: string
  description?: string
  required?: boolean
  /** @deprecated 节点默认值统一由 NodeDefinition.defaultConfig 提供。 */
  defaultValue?: TValue
}

/** 扩展类型 */
// string
export interface StringFieldSchema<TValue extends string = string> extends BaseFieldSchema<TValue> {
  type: 'string'
  ui: typeof FIELD_UI_TYPES.INPUT | typeof FIELD_UI_TYPES.TEXTAREA
}

// number
export interface NumberFieldSchema<TValue extends number = number> extends BaseFieldSchema<TValue> {
  type: 'number'
  ui: typeof FIELD_UI_TYPES.INPUT | typeof FIELD_UI_TYPES.SLIDER
  min?: number
  max?: number
  step?: number
}

// boolean
export interface BooleanFieldSchema<
  TValue extends boolean = boolean,
> extends BaseFieldSchema<TValue> {
  type: 'boolean'
  ui: typeof FIELD_UI_TYPES.SWITCH
}

// select
export interface SelectFieldSchema<
  TValue extends string | number | boolean,
> extends BaseFieldSchema<TValue> {
  type: 'select'
  ui: typeof FIELD_UI_TYPES.SELECT
  options: Array<{ label: string; value: TValue }>
}

// code
export interface CodeFieldSchema<TValue extends string = string> extends BaseFieldSchema<TValue> {
  type: 'code'
  ui: typeof FIELD_UI_TYPES.CODE_EDITOR
  language?: string
}

export type FieldSchema =
  | StringFieldSchema
  | NumberFieldSchema
  | BooleanFieldSchema
  | SelectFieldSchema<string | number | boolean>
  | CodeFieldSchema

export type FieldSchemaMap<TConfig extends object> = {
  [K in keyof TConfig]?: FieldSchema
}
