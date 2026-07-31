import type { ModelProviderTypeValue, ModelTypeValue } from '@/constant/model'

export interface ConfiguredModelVo {
  id: string
  modelId: string
  displayName?: string
  enabled: boolean
}

export interface ModelGroupVo {
  id: string
  modelType: ModelTypeValue
  name: string
  providerType: ModelProviderTypeValue
  baseUrl?: string
  maskedApiKey?: string
  enabled: boolean
  models: ConfiguredModelVo[]
  createdAt: Date
  updatedAt: Date
}

export interface ModelGroupListVo {
  items: ModelGroupVo[]
}

export interface ModelEnabledVo {
  id: string
  enabled: boolean
}

export type ModelConnectionAuthentication =
  | 'passed'
  | 'failed'
  | 'not_checked'
  | 'not_required'
  | 'unknown'
export type ModelConnectionErrorType =
  | 'timeout'
  | 'dns'
  | 'connection_refused'
  | 'tls'
  | 'network'
  | 'invalid_response'
  | 'upstream_error'

export interface ModelConnectionTestVo {
  reachable: boolean
  authentication: ModelConnectionAuthentication
  responseValid: boolean
  latencyMs: number
  upstreamStatus?: number
  errorType?: ModelConnectionErrorType
  message: string
}
