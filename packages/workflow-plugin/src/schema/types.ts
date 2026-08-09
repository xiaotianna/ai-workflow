import type {
  DataType,
  ErrorHandling,
  ErrorHandlingInput,
  JsonValue,
  VariableValue,
} from '@ai-workflow/core'

declare const pluginSchemaInput: unique symbol
declare const pluginSchemaOutput: unique symbol

export type PluginSchemaAdditionalProperties = 'reject' | 'strip' | 'allow'

export interface PluginStringSchemaAst {
  readonly kind: 'string'
  readonly minLength?: number
  readonly maxLength?: number
  readonly pattern?: string
}

export interface PluginNumberSchemaAst {
  readonly kind: 'number'
  readonly min?: number
  readonly max?: number
}

export interface PluginBooleanSchemaAst {
  readonly kind: 'boolean'
}

export interface PluginLiteralSchemaAst {
  readonly kind: 'literal'
  readonly value: string | number | boolean | null
}

export interface PluginEnumSchemaAst {
  readonly kind: 'enum'
  readonly values: readonly (string | number | boolean)[]
}

export interface PluginObjectSchemaAst {
  readonly kind: 'object'
  readonly properties: Readonly<Record<string, PluginSchemaAst>>
  readonly additionalProperties: PluginSchemaAdditionalProperties
}

export interface PluginArraySchemaAst {
  readonly kind: 'array'
  readonly item: PluginSchemaAst
  readonly minLength?: number
  readonly maxLength?: number
}

export interface PluginUnionSchemaAst {
  readonly kind: 'union'
  readonly options: readonly PluginSchemaAst[]
}

export interface PluginOptionalSchemaAst {
  readonly kind: 'optional'
  readonly schema: PluginSchemaAst
}

export interface PluginNullableSchemaAst {
  readonly kind: 'nullable'
  readonly schema: PluginSchemaAst
}

export interface PluginDefaultSchemaAst {
  readonly kind: 'default'
  readonly schema: PluginSchemaAst
  readonly value: JsonValue
}

export interface PluginJsonSchemaAst {
  readonly kind: 'json'
}

export interface PluginErrorHandlingSchemaAst {
  readonly kind: 'error-handling'
}

export interface PluginVariableValueSchemaAst {
  readonly kind: 'variable-value'
}

export interface PluginDataTypeSchemaAst {
  readonly kind: 'data-type'
}

export interface PluginResourceReferenceSchemaAst {
  readonly kind: 'resource-reference'
  readonly resourceType: string
}

export type PluginSchemaAst =
  | PluginStringSchemaAst
  | PluginNumberSchemaAst
  | PluginBooleanSchemaAst
  | PluginLiteralSchemaAst
  | PluginEnumSchemaAst
  | PluginObjectSchemaAst
  | PluginArraySchemaAst
  | PluginUnionSchemaAst
  | PluginOptionalSchemaAst
  | PluginNullableSchemaAst
  | PluginDefaultSchemaAst
  | PluginJsonSchemaAst
  | PluginErrorHandlingSchemaAst
  | PluginVariableValueSchemaAst
  | PluginDataTypeSchemaAst
  | PluginResourceReferenceSchemaAst

export type PluginSchema<TOutput = unknown, TInput = TOutput> = PluginSchemaAst & {
  readonly [pluginSchemaOutput]?: () => TOutput
  readonly [pluginSchemaInput]?: () => TInput
}

export type AnyPluginSchema = PluginSchema<any, any>

export type PluginErrorHandlingSchema = PluginSchema<ErrorHandling, ErrorHandlingInput>

export type InferPluginSchemaOutput<TSchema extends AnyPluginSchema> =
  NonNullable<TSchema[typeof pluginSchemaOutput]> extends () => infer TOutput ? TOutput : never

export type InferPluginSchemaInput<TSchema extends AnyPluginSchema> =
  NonNullable<TSchema[typeof pluginSchemaInput]> extends () => infer TInput ? TInput : never

type OptionalKeys<TProperties extends Readonly<Record<string, AnyPluginSchema>>, TMode> = {
  [TKey in keyof TProperties]: undefined extends (
    TMode extends 'input'
      ? InferPluginSchemaInput<TProperties[TKey]>
      : InferPluginSchemaOutput<TProperties[TKey]>
  )
    ? TKey
    : never
}[keyof TProperties]

type RequiredKeys<TProperties extends Readonly<Record<string, AnyPluginSchema>>, TMode> = Exclude<
  keyof TProperties,
  OptionalKeys<TProperties, TMode>
>

type InferPluginObjectValue<
  TProperties extends Readonly<Record<string, AnyPluginSchema>>,
  TMode extends 'input' | 'output',
> = {
  [TKey in RequiredKeys<TProperties, TMode>]: TMode extends 'input'
    ? InferPluginSchemaInput<TProperties[TKey]>
    : InferPluginSchemaOutput<TProperties[TKey]>
} & {
  [TKey in OptionalKeys<TProperties, TMode>]?: TMode extends 'input'
    ? InferPluginSchemaInput<TProperties[TKey]>
    : InferPluginSchemaOutput<TProperties[TKey]>
}

export type PluginObjectSchema<
  TProperties extends Readonly<Record<string, AnyPluginSchema>> = Readonly<
    Record<string, AnyPluginSchema>
  >,
> = PluginSchema<
  InferPluginObjectValue<TProperties, 'output'>,
  InferPluginObjectValue<TProperties, 'input'>
> &
  PluginObjectSchemaAst

export type AnyPluginObjectSchema = PluginObjectSchema<any>

export interface PluginResourceReference<TResourceType extends string = string> {
  readonly id: string
  readonly resourceType: TResourceType
  readonly label?: string
  readonly icon?: string
}

export type PluginJsonValue = JsonValue
export type PluginVariableValue = VariableValue
export type PluginDataType = DataType
