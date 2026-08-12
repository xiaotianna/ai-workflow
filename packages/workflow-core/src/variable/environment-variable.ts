import { z } from 'zod'

import { DATA_TYPE_KINDS, type DataType } from '../port/data-types'

export const ENVIRONMENT_VARIABLE_NAMESPACE = 'env'

export const ENVIRONMENT_VARIABLE_TYPES = {
  STRING: 'string',
  NUMBER: 'number',
  SECRET: 'secret',
} as const

export type EnvironmentVariableType =
  (typeof ENVIRONMENT_VARIABLE_TYPES)[keyof typeof ENVIRONMENT_VARIABLE_TYPES]

export const environmentVariableTypeSchema = z.enum([
  ENVIRONMENT_VARIABLE_TYPES.STRING,
  ENVIRONMENT_VARIABLE_TYPES.NUMBER,
  ENVIRONMENT_VARIABLE_TYPES.SECRET,
])

export const environmentVariableNameSchema = z
  .string()
  .trim()
  .min(1, '环境变量名称不能为空')
  .max(64, '环境变量名称不能超过 64 个字符')
  .regex(/^[a-zA-Z_][a-zA-Z0-9_]*$/, '环境变量名称只能包含字母、数字和下划线，且不能以数字开头')

const environmentVariableBaseSchema = z.object({
  id: z.string().trim().min(1),
  name: environmentVariableNameSchema,
  description: z.string().trim().max(200, '环境变量描述不能超过 200 个字符').default(''),
})

export const workflowEnvironmentVariableSchema = z.discriminatedUnion('type', [
  environmentVariableBaseSchema.extend({
    type: z.literal(ENVIRONMENT_VARIABLE_TYPES.STRING),
    value: z.string(),
  }),
  environmentVariableBaseSchema.extend({
    type: z.literal(ENVIRONMENT_VARIABLE_TYPES.NUMBER),
    value: z.number().finite(),
  }),
  environmentVariableBaseSchema.extend({
    type: z.literal(ENVIRONMENT_VARIABLE_TYPES.SECRET),
    value: z.string(),
  }),
])

export const workflowEnvironmentVariablesSchema = z
  .array(workflowEnvironmentVariableSchema)
  .default([])
  .superRefine((variables, context) => {
    const variableIndexById = new Map<string, number>(),
      variableIndexByName = new Map<string, number>()

    variables.forEach((variable, index) => {
      if (variableIndexById.has(variable.id)) {
        context.addIssue({
          code: 'custom',
          message: '环境变量 ID 不能重复',
          path: [index, 'id'],
        })
      } else {
        variableIndexById.set(variable.id, index)
      }

      if (variableIndexByName.has(variable.name)) {
        context.addIssue({
          code: 'custom',
          message: '环境变量名称不能重复',
          path: [index, 'name'],
        })
      } else {
        variableIndexByName.set(variable.name, index)
      }
    })
  })

export function getEnvironmentVariableDataType(type: EnvironmentVariableType): DataType {
  return type === ENVIRONMENT_VARIABLE_TYPES.NUMBER
    ? DATA_TYPE_KINDS.NUMBER
    : DATA_TYPE_KINDS.STRING
}

export type WorkflowEnvironmentVariable = z.output<typeof workflowEnvironmentVariableSchema>
export type WorkflowEnvironmentVariableInput = z.input<typeof workflowEnvironmentVariableSchema>
