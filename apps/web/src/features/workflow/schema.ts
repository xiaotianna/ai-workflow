import {
  ENVIRONMENT_VARIABLE_TYPES,
  environmentVariableNameSchema,
  environmentVariableTypeSchema,
  type WorkflowEnvironmentVariable,
} from '@ai-workflow/core'
import { z } from 'zod'

const environmentVariableFormBaseSchema = z.object({
  type: environmentVariableTypeSchema,
  name: environmentVariableNameSchema,
  value: z.string(),
  description: z.string().trim().max(200, '环境变量描述不能超过 200 个字符'),
})

interface CreateEnvironmentVariableFormSchemaOptions {
  editingVariableId?: string
  variables: readonly WorkflowEnvironmentVariable[]
}

export function createEnvironmentVariableFormSchema({
  editingVariableId,
  variables,
}: CreateEnvironmentVariableFormSchemaOptions) {
  return environmentVariableFormBaseSchema
    .superRefine((input, context) => {
      if (
        variables.some(
          (variable) => variable.id !== editingVariableId && variable.name === input.name,
        )
      ) {
        context.addIssue({
          code: 'custom',
          message: '环境变量名称不能重复',
          path: ['name'],
        })
      }

      if (input.value.length === 0) {
        context.addIssue({
          code: 'custom',
          message: '环境变量值不能为空',
          path: ['value'],
        })
        return
      }

      if (
        input.type === ENVIRONMENT_VARIABLE_TYPES.NUMBER &&
        (input.value.trim().length === 0 || !Number.isFinite(Number(input.value)))
      ) {
        context.addIssue({
          code: 'custom',
          message: '请输入有效数字',
          path: ['value'],
        })
      }
    })
    .transform((input) =>
      input.type === ENVIRONMENT_VARIABLE_TYPES.NUMBER
        ? { ...input, value: Number(input.value) }
        : input,
    )
}

export type EnvironmentVariableFormInput = z.input<typeof environmentVariableFormBaseSchema>
export type EnvironmentVariableFormValue = z.output<
  ReturnType<typeof createEnvironmentVariableFormSchema>
>

export function getEnvironmentVariableFormInitialValues(
  variable?: WorkflowEnvironmentVariable,
): EnvironmentVariableFormInput {
  return {
    type: variable?.type ?? ENVIRONMENT_VARIABLE_TYPES.STRING,
    name: variable?.name ?? '',
    value: variable === undefined ? '' : String(variable.value),
    description: variable?.description ?? '',
  }
}

export const workflowVersionNameFormSchema = z.object({
  name: z.string().trim().min(1, '版本名称不能为空').max(40, '版本名称不能超过 40 个字符'),
})

export type WorkflowVersionNameFormInput = z.input<typeof workflowVersionNameFormSchema>

export function getWorkflowVersionNameFormInitialValues(
  name?: string,
): WorkflowVersionNameFormInput {
  return { name: name ?? '' }
}
