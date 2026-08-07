import { jsonValueSchema } from '@ai-workflow/core'
import { z } from 'zod'

import { compilePluginSchemaToZod } from './compiler'
import type { PluginSchemaAst } from './types'

const nonNegativeIntegerSchema = z.number().int().nonnegative()

const stringSchemaAstSchema = z
  .object({
    kind: z.literal('string'),
    minLength: nonNegativeIntegerSchema.optional(),
    maxLength: nonNegativeIntegerSchema.optional(),
    pattern: z.string().optional(),
  })
  .strict()
  .superRefine((schema, context) => {
    if (
      schema.minLength !== undefined &&
      schema.maxLength !== undefined &&
      schema.minLength > schema.maxLength
    ) {
      context.addIssue({
        code: 'custom',
        path: ['maxLength'],
        message: 'maxLength 不能小于 minLength',
      })
    }

    if (schema.pattern !== undefined) {
      try {
        new RegExp(schema.pattern)
      } catch {
        context.addIssue({
          code: 'custom',
          path: ['pattern'],
          message: 'pattern 不是有效的正则表达式',
        })
      }
    }
  })

const numberSchemaAstSchema = z
  .object({
    kind: z.literal('number'),
    min: z.number().finite().optional(),
    max: z.number().finite().optional(),
  })
  .strict()
  .superRefine((schema, context) => {
    if (schema.min !== undefined && schema.max !== undefined && schema.min > schema.max) {
      context.addIssue({ code: 'custom', path: ['max'], message: 'max 不能小于 min' })
    }
  })

const literalValueSchema = z.union([z.string(), z.number().finite(), z.boolean(), z.null()])
const enumValueSchema = z.union([z.string(), z.number().finite(), z.boolean()])

export const pluginSchemaAstSchema: z.ZodType<PluginSchemaAst> = z
  .lazy(() =>
    z.discriminatedUnion('kind', [
      stringSchemaAstSchema,
      numberSchemaAstSchema,
      z.object({ kind: z.literal('boolean') }).strict(),
      z.object({ kind: z.literal('literal'), value: literalValueSchema }).strict(),
      z
        .object({ kind: z.literal('enum'), values: z.array(enumValueSchema).min(1) })
        .strict()
        .superRefine((schema, context) => {
          const values = new Set(schema.values.map((value) => `${typeof value}:${String(value)}`))
          if (values.size !== schema.values.length) {
            context.addIssue({ code: 'custom', path: ['values'], message: 'enum 值不能重复' })
          }
        }),
      z
        .object({
          kind: z.literal('object'),
          properties: z.record(z.string().min(1), pluginSchemaAstSchema),
          additionalProperties: z.enum(['reject', 'strip', 'allow']),
        })
        .strict(),
      z
        .object({
          kind: z.literal('array'),
          item: pluginSchemaAstSchema,
          minLength: nonNegativeIntegerSchema.optional(),
          maxLength: nonNegativeIntegerSchema.optional(),
        })
        .strict()
        .superRefine((schema, context) => {
          if (
            schema.minLength !== undefined &&
            schema.maxLength !== undefined &&
            schema.minLength > schema.maxLength
          ) {
            context.addIssue({
              code: 'custom',
              path: ['maxLength'],
              message: 'maxLength 不能小于 minLength',
            })
          }
        }),
      z
        .object({ kind: z.literal('union'), options: z.array(pluginSchemaAstSchema).min(2) })
        .strict(),
      z.object({ kind: z.literal('optional'), schema: pluginSchemaAstSchema }).strict(),
      z.object({ kind: z.literal('nullable'), schema: pluginSchemaAstSchema }).strict(),
      z
        .object({
          kind: z.literal('default'),
          schema: pluginSchemaAstSchema,
          value: jsonValueSchema,
        })
        .strict(),
      z.object({ kind: z.literal('json') }).strict(),
      z.object({ kind: z.literal('variable-value') }).strict(),
      z.object({ kind: z.literal('data-type') }).strict(),
      z
        .object({
          kind: z.literal('resource-reference'),
          resourceType: z.string().trim().min(1),
        })
        .strict(),
    ]),
  )
  .superRefine((schema, context) => {
    if (schema.kind !== 'default') return

    const result = compilePluginSchemaToZod(schema.schema).safeParse(schema.value)
    if (result.success) return

    for (const issue of result.error.issues) {
      context.addIssue({
        code: 'custom',
        path: ['value', ...issue.path],
        message: issue.message,
      })
    }
  })
