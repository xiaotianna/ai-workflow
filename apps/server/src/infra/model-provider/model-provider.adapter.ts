import type { ModelProviderTypeValue } from '@/constant/model'

export interface ModelProviderAdapter {
  readonly type: ModelProviderTypeValue
  readonly defaultBaseUrl: string
  readonly supportsApiKey: boolean
  createProbeUrl(baseUrl?: string | null): URL
  isValidResponse(value: unknown): boolean
}

export function createProbeUrl(baseUrl: string, pathname: string): URL {
  const normalizedBaseUrl = `${baseUrl.replace(/\/+$/, '')}/`
  return new URL(pathname, normalizedBaseUrl)
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
