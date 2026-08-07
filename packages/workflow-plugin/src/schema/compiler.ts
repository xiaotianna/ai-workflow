import { DATA_TYPE_VALUES, jsonValueSchema, variableValueSchema } from '@ai-workflow/core'
import { z } from 'zod'

import type {
  AnyPluginSchema,
  InferPluginSchemaInput,
  InferPluginSchemaOutput,
  PluginSchemaAst,
} from './types'

function compileAst(schema: PluginSchemaAst): z.ZodType {
  switch (schema.kind) {
    case 'string': {
      let result = z.string()
      if (schema.minLength !== undefined) result = result.min(schema.minLength)
      if (schema.maxLength !== undefined) result = result.max(schema.maxLength)
      if (schema.pattern !== undefined) result = result.regex(new RegExp(schema.pattern))
      return result
    }
    case 'number': {
      let result = z.number().finite()
      if (schema.min !== undefined) result = result.min(schema.min)
      if (schema.max !== undefined) result = result.max(schema.max)
      return result
    }
    case 'boolean': {
      return z.boolean()
    }
    case 'literal': {
      return z.literal(schema.value)
    }
    case 'enum': {
      const literals = schema.values.map((value) => z.literal(value))
      if (literals.length === 0) return z.never()
      if (literals.length === 1) return literals[0]
      return z.union(literals as [z.ZodLiteral, z.ZodLiteral, ...z.ZodLiteral[]])
    }
    case 'object': {
      const shape = Object.fromEntries(
        Object.entries(schema.properties).map(([key, property]) => [key, compileAst(property)]),
      )
      const result = z.object(shape)
      if (schema.additionalProperties === 'allow') return result.passthrough()
      if (schema.additionalProperties === 'strip') return result.strip()
      return result.strict()
    }
    case 'array': {
      let result = z.array(compileAst(schema.item))
      if (schema.minLength !== undefined) result = result.min(schema.minLength)
      if (schema.maxLength !== undefined) result = result.max(schema.maxLength)
      return result
    }
    case 'union': {
      const options = schema.options.map(compileAst)
      if (options.length < 2) return z.never()
      return z.union(options as [z.ZodType, z.ZodType, ...z.ZodType[]])
    }
    case 'optional': {
      return compileAst(schema.schema).optional()
    }
    case 'nullable': {
      return compileAst(schema.schema).nullable()
    }
    case 'default': {
      return compileAst(schema.schema).default(schema.value)
    }
    case 'json': {
      return jsonValueSchema
    }
    case 'variable-value': {
      return variableValueSchema
    }
    case 'data-type': {
      return z.enum(DATA_TYPE_VALUES)
    }
    case 'resource-reference': {
      return z
        .object({
          id: z.string().trim().min(1),
          resourceType: z.literal(schema.resourceType),
          label: z.string().trim().min(1).optional(),
          icon: z.string().trim().min(1).optional(),
        })
        .strict()
    }
  }
}

export function compilePluginSchemaToZod<TSchema extends AnyPluginSchema>(
  schema: TSchema,
): z.ZodType<InferPluginSchemaOutput<TSchema>, InferPluginSchemaInput<TSchema>> {
  return compileAst(schema) as z.ZodType<
    InferPluginSchemaOutput<TSchema>,
    InferPluginSchemaInput<TSchema>
  >
}
