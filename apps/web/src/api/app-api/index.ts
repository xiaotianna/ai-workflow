import { apiClient } from '@/api/client'

export type AppApiPublishStatus = 'RUNNING' | 'UNPUBLISHED'
export type AppApiInputDataType = 'string' | 'number' | 'boolean' | 'json'

export interface AppApiInputVariableDto {
  key: string
  label: string
  dataType: AppApiInputDataType
  description?: string
  required: boolean
  defaultValue?: unknown
}

export interface AppApiVersionInputContractDto {
  versionId: string
  version: number
  name?: string
  inputVariables: AppApiInputVariableDto[]
}

export interface AppApiOverviewDto {
  appId: string
  status: AppApiPublishStatus
  shareEnabled: boolean
  shareToken?: string
  currentVersionId?: string
  versions: AppApiVersionInputContractDto[]
}

export interface PublicAppApiDocsDto {
  appId: string
  title: string
  author: string
  description?: string
  icon?: string
  status: AppApiPublishStatus
  currentVersionId?: string
  versions: AppApiVersionInputContractDto[]
}

export interface AppApiKeyDto {
  id: string
  maskedKey: string
  createdAt: string
  lastUsedAt?: string
}

export interface CreatedAppApiKeyDto extends AppApiKeyDto {
  key: string
}

export function getAppApiOverview(appId: string, signal?: AbortSignal): Promise<AppApiOverviewDto> {
  return apiClient.get<AppApiOverviewDto>(`/studio/apps/${encodeURIComponent(appId)}/app-api`, {
    signal,
  })
}

export function updateAppApiShare(appId: string, enabled: boolean): Promise<AppApiOverviewDto> {
  return apiClient.patch<AppApiOverviewDto, { enabled: boolean }>(
    `/studio/apps/${encodeURIComponent(appId)}/app-api/share`,
    { enabled },
  )
}

export function listAppApiKeys(appId: string): Promise<AppApiKeyDto[]> {
  return apiClient.get<AppApiKeyDto[]>(`/studio/apps/${encodeURIComponent(appId)}/app-api/keys`)
}

export function createAppApiKey(appId: string): Promise<CreatedAppApiKeyDto> {
  return apiClient.post<CreatedAppApiKeyDto>(
    `/studio/apps/${encodeURIComponent(appId)}/app-api/keys`,
  )
}

export function revokeAppApiKey(appId: string, apiKeyId: string): Promise<void> {
  return apiClient.delete<void>(
    `/studio/apps/${encodeURIComponent(appId)}/app-api/keys/${encodeURIComponent(apiKeyId)}`,
  )
}

export function getPublicAppApiDocs(
  shareToken: string,
  signal?: AbortSignal,
): Promise<PublicAppApiDocsDto> {
  return apiClient.get<PublicAppApiDocsDto>(`/public/app-api/${encodeURIComponent(shareToken)}`, {
    signal,
  })
}
