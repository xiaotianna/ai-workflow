import { z } from 'zod'

import type { ModelGroupDto } from '@/api/models'

export const MODEL_PROVIDER_TYPES = ['openai', 'deepseek', 'ollama'] as const

const baseUrlSchema = z
    .string()
    .trim()
    .max(300, 'Base URL 不能超过 300 个字符')
    .refine((value) => {
      if (value === '' || !URL.canParse(value)) return value === ''

      const url = new URL(value)
      return (
        (url.protocol === 'http:' || url.protocol === 'https:') &&
        !url.username &&
        !url.password &&
        !url.search &&
        !url.hash
      )
    }, 'Base URL 需要使用 HTTP/HTTPS，且不能包含凭证、查询参数或片段')
    .transform((value) => value || undefined),
  modelIdSchema = z
    .string()
    .trim()
    .min(1, '模型 ID 不能为空')
    .max(100, '模型 ID 不能超过 100 个字符'),
  modelItemFormSchema = z.object({
    id: z.uuid().optional(),
    modelId: modelIdSchema,
    displayName: z
      .string()
      .trim()
      .max(100, '显示名称不能超过 100 个字符')
      .transform((value) => value || undefined),
    enabled: z.boolean(),
  }),
  apiKeySchema = z
    .string()
    .trim()
    .max(300, 'Key 不能超过 300 个字符')
    .transform((value) => value || undefined)

export const modelConnectionFormSchema = z.object({
  providerType: z.enum(MODEL_PROVIDER_TYPES),
  baseUrl: baseUrlSchema,
  apiKey: apiKeySchema,
})

export const modelTestFormSchema = modelConnectionFormSchema.extend({
  modelId: modelIdSchema,
})

export const modelGroupFormSchema = modelConnectionFormSchema
  .extend({
    name: z.string().trim().min(1, '模型组名称不能为空').max(40, '模型组名称不能超过 40 个字符'),
    models: z.array(modelItemFormSchema).min(1, '至少添加一个模型').max(30, '最多添加 30 个模型'),
  })
  .superRefine((value, context) => {
    const modelIdIndexes = new Map<string, number>()

    value.models.forEach((model, index) => {
      const normalizedModelId = model.modelId.trim().toLowerCase(),
        existingIndex = modelIdIndexes.get(normalizedModelId)

      if (existingIndex !== undefined) {
        context.addIssue({
          code: 'custom',
          message: '同一模型组内的模型 ID 不能重复',
          path: ['models', index, 'modelId'],
        })
        return
      }

      modelIdIndexes.set(normalizedModelId, index)
    })
  })

export type ModelProviderType = (typeof MODEL_PROVIDER_TYPES)[number]
export type ModelConnection = z.output<typeof modelConnectionFormSchema>
export type ModelGroupFormInput = z.input<typeof modelGroupFormSchema>
export type ModelGroupInput = z.output<typeof modelGroupFormSchema>
export type ModelItemFormInput = ModelGroupFormInput['models'][number]
export type ModelGroup = ModelGroupDto

export function createEmptyModelItem(): ModelItemFormInput {
  return {
    modelId: '',
    displayName: '',
    enabled: true,
  }
}

export function createEmptyModelGroupForm(): ModelGroupFormInput {
  return {
    name: '',
    providerType: 'openai',
    baseUrl: '',
    apiKey: '',
    models: [createEmptyModelItem()],
  }
}

export function toModelGroupFormInput(group: ModelGroup): ModelGroupFormInput {
  return {
    name: group.name,
    providerType: group.providerType,
    baseUrl: group.baseUrl ?? '',
    apiKey: group.maskedApiKey ?? '',
    models: group.models.map((model) => ({
      id: model.id,
      modelId: model.modelId,
      displayName: model.displayName ?? '',
      enabled: model.enabled,
    })),
  }
}
