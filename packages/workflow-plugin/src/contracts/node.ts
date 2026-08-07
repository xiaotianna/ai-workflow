import type { DataType, JsonValue, VariableReference } from '@ai-workflow/core'
import { DATA_TYPE_VALUES, jsonValueSchema, nodeOutputDefinitionSchema } from '@ai-workflow/core'
import { z } from 'zod'

import { pluginFieldSchema, type PluginFieldSchema } from './field'
import { pluginNodeKeySchema, pluginPortIdSchema } from './identifiers'
import { pluginModuleReferenceSchema, type PluginModuleReference } from './module-reference'
import { compilePluginSchemaToZod } from '../schema/compiler'
import { pluginSchemaAstSchema } from '../schema/ast-schema'
import type {
  AnyPluginObjectSchema,
  AnyPluginSchema,
  InferPluginSchemaInput,
  InferPluginSchemaOutput,
  PluginObjectSchema,
} from '../schema/types'

export interface PluginPortDefinition {
  readonly dataType?: DataType
  readonly required?: boolean
  readonly multiple?: boolean
  readonly label?: string
  readonly description?: string
}

export type PluginPortMap = Readonly<Record<string, PluginPortDefinition>>

type OptionalVariableReferencePath<TReference> = TReference extends { readonly path: infer TPath }
  ? Omit<TReference, 'path'> & { readonly path?: TPath }
  : TReference

export type PluginVariableReferenceInput = OptionalVariableReferencePath<VariableReference>

export type PluginVariableValueInput =
  | { readonly type: 'value'; readonly value: JsonValue }
  | { readonly type: 'reference'; readonly reference: PluginVariableReferenceInput }

export interface PluginNodeOutputDefinition {
  readonly key: string
  readonly label: string
  readonly dataType: DataType
  readonly description?: string
  readonly defaultValue?: JsonValue
  readonly required?: boolean
  readonly value?: PluginVariableValueInput
}

export interface PluginNodeUIWithBase {
  readonly custom: false
  readonly content?: PluginModuleReference
}

export interface PluginCustomNodeUI {
  readonly custom: true
  readonly renderer: PluginModuleReference
}

export type PluginNodeUI = PluginNodeUIWithBase | PluginCustomNodeUI

export type PluginFormUI =
  | { readonly custom: false }
  | { readonly custom: true; readonly renderer: PluginModuleReference }

export type PluginExecution =
  | { readonly kind: 'none' }
  | { readonly kind: 'sandbox-js'; readonly entry: string }

export type PluginNodeForm<TConfig extends object> = Partial<
  Readonly<Record<Extract<keyof TConfig, string>, PluginFieldSchema>>
>

export interface PluginNodeDefinition<
  TSchema extends AnyPluginObjectSchema = AnyPluginObjectSchema,
  TKey extends string = string,
> {
  readonly key: TKey
  readonly label: string
  readonly description?: string
  readonly icon?: string
  readonly config: {
    readonly schemaVersion: number
    readonly schema: TSchema
    readonly initial: InferPluginSchemaInput<TSchema>
    readonly form?: PluginNodeForm<InferPluginSchemaOutput<TSchema> & object>
  }
  readonly ports: {
    readonly inputs: PluginPortMap
    readonly outputs: PluginPortMap
  }
  readonly fixedOutputs?: readonly PluginNodeOutputDefinition[]
  readonly ui?: {
    readonly node: PluginNodeUI
    readonly form: PluginFormUI
  }
  readonly execution?: PluginExecution
}

export function defineNode<
  const TSchema extends AnyPluginObjectSchema,
  const TNode extends PluginNodeDefinition<TSchema>,
>(node: TNode): TNode {
  return node
}

const pluginPortDefinitionSchema = z
  .object({
    dataType: z.enum(DATA_TYPE_VALUES).default('json'),
    required: z.boolean().optional(),
    multiple: z.boolean().optional(),
    label: z.string().trim().min(1).optional(),
    description: z.string().trim().optional(),
  })
  .strict()

const pluginPortMapSchema = z.record(pluginPortIdSchema, pluginPortDefinitionSchema)

export const pluginNodeOutputDefinitionSchema = nodeOutputDefinitionSchema.refine(
  (output) => jsonValueSchema.safeParse(output).success,
  '节点固定输出必须是可序列化 JSON',
)

export const pluginNodeOutputDefinitionsSchema = z
  .array(pluginNodeOutputDefinitionSchema)
  .superRefine((outputs, context) => {
    const keys = new Set<string>()
    outputs.forEach((output, index) => {
      if (keys.has(output.key)) {
        context.addIssue({
          code: 'custom',
          path: [index, 'key'],
          message: `节点固定输出 Key 不能重复：${output.key}`,
        })
      }
      keys.add(output.key)
    })
  })

const pluginNodeUISchema = z.discriminatedUnion('custom', [
  z.object({ custom: z.literal(false), content: pluginModuleReferenceSchema.optional() }).strict(),
  z.object({ custom: z.literal(true), renderer: pluginModuleReferenceSchema }).strict(),
])

const pluginFormUISchema = z.discriminatedUnion('custom', [
  z.object({ custom: z.literal(false) }).strict(),
  z.object({ custom: z.literal(true), renderer: pluginModuleReferenceSchema }).strict(),
])

const safeExecutorEntrySchema = pluginModuleReferenceSchema.shape.entry

const pluginExecutionSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('none') }).strict(),
  z.object({ kind: z.literal('sandbox-js'), entry: safeExecutorEntrySchema }).strict(),
])

export const pluginNodeDefinitionSchema = z
  .object({
    key: pluginNodeKeySchema,
    label: z.string().trim().min(1),
    description: z.string().trim().optional(),
    icon: safeExecutorEntrySchema.optional(),
    config: z
      .object({
        schemaVersion: z.number().int().positive(),
        schema: pluginSchemaAstSchema.refine((schema) => schema.kind === 'object', {
          message: '节点配置 schema 顶层必须是 object',
        }),
        initial: jsonValueSchema,
        form: z.record(z.string().min(1), pluginFieldSchema).optional(),
      })
      .strict(),
    ports: z.object({ inputs: pluginPortMapSchema, outputs: pluginPortMapSchema }).strict(),
    fixedOutputs: pluginNodeOutputDefinitionsSchema.optional(),
    ui: z
      .object({ node: pluginNodeUISchema, form: pluginFormUISchema })
      .strict()
      .default({ node: { custom: false }, form: { custom: false } }),
    execution: pluginExecutionSchema.default({ kind: 'none' }),
  })
  .strict()
  .superRefine((node, context) => {
    if (node.config.schema.kind !== 'object') return

    const result = compilePluginSchemaToZod(node.config.schema).safeParse(node.config.initial)
    if (!result.success) {
      for (const issue of result.error.issues) {
        context.addIssue({
          code: 'custom',
          path: ['config', 'initial', ...issue.path],
          message: issue.message,
        })
      }
    }

    for (const fieldName of Object.keys(node.config.form ?? {})) {
      if (!(fieldName in node.config.schema.properties)) {
        context.addIssue({
          code: 'custom',
          path: ['config', 'form', fieldName],
          message: `表单字段未在配置 schema 中声明：${fieldName}`,
        })
      }
    }
  })

export type ParsedPluginNodeDefinition = z.output<typeof pluginNodeDefinitionSchema>
export type AnyPluginNodeDefinition = PluginNodeDefinition<PluginObjectSchema<any>>
export type InferPluginNodeSchema<TNode extends AnyPluginNodeDefinition> =
  TNode['config']['schema'] extends AnyPluginSchema ? TNode['config']['schema'] : never
