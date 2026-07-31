import { createProbeUrl, isRecord, type ModelProviderAdapter } from './model-provider.adapter'

export class OllamaModelProviderAdapter implements ModelProviderAdapter {
  readonly type = 'ollama'
  readonly defaultBaseUrl = 'http://localhost:11434'
  readonly supportsApiKey = false

  createProbeUrl(baseUrl?: string | null): URL {
    return createProbeUrl(baseUrl || this.defaultBaseUrl, 'api/tags')
  }

  isValidResponse(value: unknown): boolean {
    if (!isRecord(value) || !Array.isArray(value.models)) return false

    return value.models.every(
      (model) =>
        isRecord(model) && (typeof model.model === 'string' || typeof model.name === 'string'),
    )
  }
}
