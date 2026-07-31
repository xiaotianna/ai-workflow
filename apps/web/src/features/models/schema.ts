import { z } from 'zod'

export const MODEL_PROVIDER_TYPES = ['openai', 'deepseek', 'ollama'] as const

const baseUrlSchema = z
  .string()
  .trim()
  .max(300, 'Base URL 不能超过 300 个字符')
  .refine((value) => value === '' || URL.canParse(value), 'Base URL 需要包含正确的协议和地址')
  .transform((value) => value || undefined)

const modelItemFormSchema = z.object({
  modelId: z.string().trim().min(1, '模型 ID 不能为空').max(100, '模型 ID 不能超过 100 个字符'),
  displayName: z
    .string()
    .trim()
    .max(100, '显示名称不能超过 100 个字符')
    .transform((value) => value || undefined),
  enabled: z.boolean(),
})

export const modelConnectionFormSchema = z.object({
  providerType: z.enum(MODEL_PROVIDER_TYPES),
  baseUrl: baseUrlSchema,
})

export const modelGroupFormSchema = modelConnectionFormSchema
  .extend({
    name: z.string().trim().min(1, '模型组名称不能为空').max(40, '模型组名称不能超过 40 个字符'),
    apiKey: z
      .string()
      .trim()
      .max(300, 'Key 不能超过 300 个字符')
      .transform((value) => value || undefined),
    models: z.array(modelItemFormSchema).min(1, '至少添加一个模型').max(30, '最多添加 30 个模型'),
  })
  .superRefine((value, context) => {
    const modelIdIndexes = new Map<string, number>()

    value.models.forEach((model, index) => {
      const normalizedModelId = model.modelId.trim().toLowerCase()
      const existingIndex = modelIdIndexes.get(normalizedModelId)

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
export type ModelGroup = ModelGroupInput & {
  id: string
  enabled: boolean
}

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
    apiKey: group.apiKey ?? '',
    models: group.models.map((model) => ({
      modelId: model.modelId,
      displayName: model.displayName ?? '',
      enabled: model.enabled,
    })),
  }
}
