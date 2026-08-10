import {
  createProbeUrl,
  isRecord,
  type ModelChatStreamProbe,
  type ModelEmbeddingRequest,
  type ModelProviderAdapter,
  parseEmbeddingVector,
} from './model-provider.adapter'

export class OllamaModelProviderAdapter implements ModelProviderAdapter {
  readonly type = 'ollama'
  readonly defaultBaseUrl = 'http://localhost:11434'
  readonly supportsApiKey = false

  createProbeUrl(baseUrl?: string | null): URL {
    return createProbeUrl(baseUrl || this.defaultBaseUrl, 'api/tags')
  }

  createChatStreamProbe(
    modelId: string,
    prompt: string,
    baseUrl?: string | null,
  ): ModelChatStreamProbe {
    return {
      url: createProbeUrl(baseUrl || this.defaultBaseUrl, 'api/chat'),
      protocol: 'ndjson',
      body: {
        model: modelId,
        messages: [{ role: 'user', content: prompt }],
        stream: true,
        think: false,
      },
      extractMessage: extractOllamaMessage,
    }
  }

  createEmbeddingRequest(
    modelId: string,
    inputs: readonly string[],
    baseUrl?: string | null,
  ): ModelEmbeddingRequest {
    return {
      url: createProbeUrl(baseUrl || this.defaultBaseUrl, 'api/embed'),
      body: { model: modelId, input: inputs },
      extractEmbeddings(value: unknown): number[][] {
        if (!isRecord(value) || !Array.isArray(value.embeddings)) {
          throw new Error('Embedding 响应结构无效')
        }
        return value.embeddings.map(parseEmbeddingVector)
      },
    }
  }

  isValidResponse(value: unknown): boolean {
    if (!isRecord(value) || !Array.isArray(value.models)) return false

    return value.models.every(
      (model) =>
        isRecord(model) && (typeof model.model === 'string' || typeof model.name === 'string'),
    )
  }
}

function extractOllamaMessage(value: unknown): string | undefined {
  if (!isRecord(value) || !isRecord(value.message)) return undefined

  const message = value.message
  if (typeof message.content === 'string' && message.content.trim()) return message.content
  if (typeof message.thinking === 'string' && message.thinking.trim()) return message.thinking

  return undefined
}
