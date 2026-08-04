import type { ModelProviderTypeValue } from '@/constant/model'

export interface ExecutorModelResolutionVo {
  providerType: ModelProviderTypeValue
  modelId: string
  baseUrl: string
  apiKey?: string
}
