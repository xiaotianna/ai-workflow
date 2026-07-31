import type { ModelProviderTypeValue } from '@/constant/model'
import {
  createProbeUrl,
  isRecord,
  type ModelChatStreamProbe,
  type ModelProviderAdapter,
} from './model-provider.adapter'

export class OpenAiCompatibleModelProviderAdapter implements ModelProviderAdapter {
  readonly supportsApiKey = true

  constructor(
    readonly type: ModelProviderTypeValue,
    readonly defaultBaseUrl: string,
  ) {}

  createProbeUrl(baseUrl?: string | null): URL {
    return createProbeUrl(baseUrl || this.defaultBaseUrl, 'models')
  }

  createChatStreamProbe(
    modelId: string,
    prompt: string,
    baseUrl?: string | null,
  ): ModelChatStreamProbe {
    return {
      url: createProbeUrl(baseUrl || this.defaultBaseUrl, 'chat/completions'),
      protocol: 'sse',
      body: {
        model: modelId,
        messages: [{ role: 'user', content: prompt }],
        stream: true,
      },
      extractMessage: extractOpenAiCompatibleMessage,
    }
  }

  isValidResponse(value: unknown): boolean {
    if (!isRecord(value) || !Array.isArray(value.data)) return false

    return value.data.every(
      (model) => isRecord(model) && typeof model.id === 'string' && model.id.length > 0,
    )
  }
}

function extractOpenAiCompatibleMessage(value: unknown): string | undefined {
  if (!isRecord(value) || !Array.isArray(value.choices)) return undefined

  const choice = value.choices[0]
  if (!isRecord(choice) || !isRecord(choice.delta)) return undefined

  return typeof choice.delta.content === 'string' && choice.delta.content.trim()
    ? choice.delta.content
    : undefined
}
