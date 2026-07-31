export const MODEL_TYPES = ['chat', 'embedding'] as const
export type ModelTypeValue = (typeof MODEL_TYPES)[number]

export const MODEL_PROVIDER_TYPES = ['openai', 'deepseek', 'ollama'] as const
export type ModelProviderTypeValue = (typeof MODEL_PROVIDER_TYPES)[number]
