import type { ModelProviderTypeValue } from '@/constant/model'
import {
  createProbeUrl,
  isRecord,
  type ModelChatStreamProbe,
  type ModelEmbeddingRequest,
  type ModelProviderAdapter,
  parseEmbeddingVector,
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

  createEmbeddingRequest(
    modelId: string,
    inputs: readonly string[],
    baseUrl?: string | null,
  ): ModelEmbeddingRequest {
    return {
      url: createProbeUrl(baseUrl || this.defaultBaseUrl, 'embeddings'),
      body: { model: modelId, input: inputs },
      extractEmbeddings(value: unknown): number[][] {
        if (!isRecord(value) || !Array.isArray(value.data)) {
          throw new Error('Embedding 响应结构无效')
        }
        return value.data
          .map((item) => {
            if (!isRecord(item) || !Number.isSafeInteger(item.index)) {
              throw new Error('Embedding 响应缺少有效 index')
            }
            return { index: item.index as number, vector: parseEmbeddingVector(item.embedding) }
          })
          .sort((left, right) => left.index - right.index)
          .map(({ vector }) => vector)
      },
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
