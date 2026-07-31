import type { ModelProviderTypeValue } from '@/constant/model'
import { createProbeUrl, isRecord, type ModelProviderAdapter } from './model-provider.adapter'

export class OpenAiCompatibleModelProviderAdapter implements ModelProviderAdapter {
  readonly supportsApiKey = true

  constructor(
    readonly type: ModelProviderTypeValue,
    readonly defaultBaseUrl: string,
  ) {}

  createProbeUrl(baseUrl?: string | null): URL {
    return createProbeUrl(baseUrl || this.defaultBaseUrl, 'models')
  }

  isValidResponse(value: unknown): boolean {
    if (!isRecord(value) || !Array.isArray(value.data)) return false

    return value.data.every(
      (model) => isRecord(model) && typeof model.id === 'string' && model.id.length > 0,
    )
  }
}
