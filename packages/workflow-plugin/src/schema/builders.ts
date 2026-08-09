import type { JsonValue, VariableValue } from '@ai-workflow/core'

import type {
  AnyPluginSchema,
  InferPluginSchemaInput,
  InferPluginSchemaOutput,
  PluginDataType,
  PluginErrorHandlingSchema,
  PluginObjectSchema,
  PluginResourceReference,
  PluginSchema,
  PluginSchemaAdditionalProperties,
} from './types'

export interface PluginStringSchemaOptions {
  readonly minLength?: number
  readonly maxLength?: number
  readonly pattern?: string
}

export interface PluginNumberSchemaOptions {
  readonly min?: number
  readonly max?: number
}

export interface PluginArraySchemaOptions {
  readonly minLength?: number
  readonly maxLength?: number
}

export interface PluginObjectSchemaOptions {
  readonly additionalProperties?: PluginSchemaAdditionalProperties
}

function string(options: PluginStringSchemaOptions = {}): PluginSchema<string> {
  return { kind: 'string', ...options }
}

function number(options: PluginNumberSchemaOptions = {}): PluginSchema<number> {
  return { kind: 'number', ...options }
}

function boolean(): PluginSchema<boolean> {
  return { kind: 'boolean' }
}

function literal<const TValue extends string | number | boolean | null>(
  value: TValue,
): PluginSchema<TValue> {
  return { kind: 'literal', value }
}

function enumeration<
  const TValues extends readonly [string | number | boolean, ...Array<string | number | boolean>],
>(values: TValues): PluginSchema<TValues[number]> {
  return { kind: 'enum', values }
}

function object<const TProperties extends Readonly<Record<string, AnyPluginSchema>>>(
  properties: TProperties,
  options: PluginObjectSchemaOptions = {},
): PluginObjectSchema<TProperties> {
  return {
    kind: 'object',
    properties,
    additionalProperties: options.additionalProperties ?? 'reject',
  } as PluginObjectSchema<TProperties>
}

function array<TItem extends AnyPluginSchema>(
  item: TItem,
  options: PluginArraySchemaOptions = {},
): PluginSchema<InferPluginSchemaOutput<TItem>[], InferPluginSchemaInput<TItem>[]> {
  return { kind: 'array', item, ...options }
}

function union<
  const TOptions extends readonly [AnyPluginSchema, AnyPluginSchema, ...AnyPluginSchema[]],
>(
  options: TOptions,
): PluginSchema<
  InferPluginSchemaOutput<TOptions[number]>,
  InferPluginSchemaInput<TOptions[number]>
> {
  return { kind: 'union', options }
}

function optional<TSchema extends AnyPluginSchema>(
  schema: TSchema,
): PluginSchema<
  InferPluginSchemaOutput<TSchema> | undefined,
  InferPluginSchemaInput<TSchema> | undefined
> {
  return { kind: 'optional', schema }
}

function nullable<TSchema extends AnyPluginSchema>(
  schema: TSchema,
): PluginSchema<InferPluginSchemaOutput<TSchema> | null, InferPluginSchemaInput<TSchema> | null> {
  return { kind: 'nullable', schema }
}

function withDefault<TSchema extends AnyPluginSchema>(
  schema: TSchema,
  value: InferPluginSchemaOutput<TSchema> & JsonValue,
): PluginSchema<InferPluginSchemaOutput<TSchema>, InferPluginSchemaInput<TSchema> | undefined> {
  return { kind: 'default', schema, value }
}

function json(): PluginSchema<JsonValue> {
  return { kind: 'json' }
}

function errorHandling(): PluginErrorHandlingSchema {
  return { kind: 'error-handling' }
}

function variableValue(): PluginSchema<VariableValue> {
  return { kind: 'variable-value' }
}

function dataType(): PluginSchema<PluginDataType> {
  return { kind: 'data-type' }
}

function resourceReference<const TResourceType extends string>(
  resourceType: TResourceType,
): PluginSchema<PluginResourceReference<TResourceType>> {
  return { kind: 'resource-reference', resourceType }
}

export const pluginSchema = {
  string,
  number,
  boolean,
  literal,
  enum: enumeration,
  object,
  array,
  union,
  optional,
  nullable,
  default: withDefault,
  json,
  errorHandling,
  variableValue,
  dataType,
  resourceReference,
} as const
