import { apiClient } from '@/api/client'

export type ModelType = 'chat' | 'embedding'
export type ModelProviderType = 'openai' | 'deepseek' | 'ollama'

export interface ConfiguredModelDto {
  id: string
  modelId: string
  displayName?: string
  enabled: boolean
}

export interface ModelGroupDto {
  id: string
  modelType: ModelType
  name: string
  providerType: ModelProviderType
  baseUrl?: string
  maskedApiKey?: string
  enabled: boolean
  models: ConfiguredModelDto[]
  createdAt: string
  updatedAt: string
}

export interface ModelGroupListResult {
  items: ModelGroupDto[]
}

export interface ConfiguredModelInput {
  id?: string
  modelId: string
  displayName?: string
  enabled: boolean
}

interface ModelGroupConfigurationInput {
  name: string
  providerType: ModelProviderType
  baseUrl?: string | null
  apiKey?: string | null
  models: ConfiguredModelInput[]
}

export interface CreateModelGroupParams extends ModelGroupConfigurationInput {
  modelType: ModelType
  apiKey?: string
}

export type UpdateModelGroupParams = ModelGroupConfigurationInput

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

export interface TestModelConnectionParams {
  providerType: ModelProviderType
  baseUrl?: string | null
  apiKey?: string
  credentialGroupId?: string
}

export interface ModelConnectionTestResult {
  reachable: boolean
  authentication: ModelConnectionAuthentication
  responseValid: boolean
  latencyMs: number
  upstreamStatus?: number
  errorType?: ModelConnectionErrorType
  message: string
}

export interface TestModelParams extends TestModelConnectionParams {
  modelId: string
}

export interface ModelTestResult {
  available: boolean
  latencyMs: number
  upstreamStatus?: number
  errorType?: ModelConnectionErrorType
  message: string
}

export interface ModelEnabledResult {
  id: string
  enabled: boolean
}

export function listModelGroups(
  modelType?: ModelType,
  signal?: AbortSignal,
): Promise<ModelGroupListResult> {
  return apiClient.get<ModelGroupListResult>('/models/groups', {
    params: modelType ? { modelType } : undefined,
    signal,
  })
}

export function createModelGroup(values: CreateModelGroupParams): Promise<ModelGroupDto> {
  return apiClient.post<ModelGroupDto, CreateModelGroupParams>('/models/groups', values)
}

export function updateModelGroup(
  groupId: string,
  values: UpdateModelGroupParams,
): Promise<ModelGroupDto> {
  return apiClient.put<ModelGroupDto, UpdateModelGroupParams>(
    `/models/groups/${encodeURIComponent(groupId)}`,
    values,
  )
}

export function deleteModelGroup(groupId: string): Promise<void> {
  return apiClient.delete<void>(`/models/groups/${encodeURIComponent(groupId)}`)
}

export function updateModelGroupEnabled(
  groupId: string,
  enabled: boolean,
): Promise<ModelEnabledResult> {
  return apiClient.patch<ModelEnabledResult, { enabled: boolean }>(
    `/models/groups/${encodeURIComponent(groupId)}/enabled`,
    { enabled },
  )
}

export function updateConfiguredModelEnabled(
  groupId: string,
  modelId: string,
  enabled: boolean,
): Promise<ModelEnabledResult> {
  return apiClient.patch<ModelEnabledResult, { enabled: boolean }>(
    `/models/groups/${encodeURIComponent(groupId)}/models/${encodeURIComponent(modelId)}/enabled`,
    { enabled },
  )
}

export function testModelConnection(
  values: TestModelConnectionParams,
  signal?: AbortSignal,
): Promise<ModelConnectionTestResult> {
  return apiClient.post<ModelConnectionTestResult, TestModelConnectionParams>(
    '/models/test-connection',
    values,
    { signal },
  )
}

export function testModel(values: TestModelParams, signal?: AbortSignal): Promise<ModelTestResult> {
  return apiClient.post<ModelTestResult, TestModelParams>('/models/test-model', values, {
    signal,
  })
}
