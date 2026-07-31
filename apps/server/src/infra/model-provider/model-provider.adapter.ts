import type { ModelProviderTypeValue } from '@/constant/model'

export type ModelChatStreamProtocol = 'sse' | 'ndjson'

export interface ModelChatStreamProbe {
  url: URL
  protocol: ModelChatStreamProtocol
  body: Record<string, unknown>
  extractMessage(value: unknown): string | undefined
}

export interface ModelProviderAdapter {
  readonly type: ModelProviderTypeValue
  readonly defaultBaseUrl: string
  readonly supportsApiKey: boolean
  createProbeUrl(baseUrl?: string | null): URL
  createChatStreamProbe(
    modelId: string,
    prompt: string,
    baseUrl?: string | null,
  ): ModelChatStreamProbe
  isValidResponse(value: unknown): boolean
}

export function createProbeUrl(baseUrl: string, pathname: string): URL {
  const normalizedBaseUrl = `${baseUrl.replace(/\/+$/, '')}/`
  return new URL(pathname, normalizedBaseUrl)
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
