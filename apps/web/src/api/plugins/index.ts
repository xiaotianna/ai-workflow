import { apiClient } from '@/api/client'

export type PluginVisibility = 'PUBLIC' | 'PRIVATE'
export type PluginListScope = 'ALL' | 'INSTALLED' | 'USED' | 'MINE'
export type PluginListSort = 'updated_desc' | 'created_desc' | 'name_asc'

export interface PluginListItemDto {
  id: string
  packageName: string
  name: string
  description: string
  author: {
    id: string
    username: string
  }
  verified: boolean
  visibility: PluginVisibility
  installCount: number
  latestVersion: {
    version: string
    publishedAt: string
  }
  createdAt: string
  updatedAt: string
}

export interface PluginListResult {
  items: PluginListItemDto[]
  nextCursor: string | null
}

export interface ListPluginsParams {
  cursor?: string
  limit?: number
  search?: string
  scope?: PluginListScope
  sort?: PluginListSort
}

export interface PublishPluginParams {
  file: File
  visibility: PluginVisibility
  changelog?: string
}

export interface PublishedPluginVersionDto {
  id: string
  pluginId: string
  packageName: string
  author: string
  version: string
  visibility: PluginVisibility
  archiveDigest: string
  artifactDigest: string
  publishedAt: string
}

export interface PluginDetailDto extends PluginListItemDto {
  content: string
  versions: Array<{
    version: string
    publishedAt: string
    author: string
    changelog: string
  }>
}

export function listPlugins(
  params: ListPluginsParams,
  signal?: AbortSignal,
): Promise<PluginListResult> {
  return apiClient.get<PluginListResult>('/plugins', {
    params,
    signal,
  })
}

export function publishPlugin(values: PublishPluginParams): Promise<PublishedPluginVersionDto> {
  const formData = new FormData()
  formData.append('file', values.file)
  formData.append('visibility', values.visibility)
  if (values.changelog) formData.append('changelog', values.changelog)

  return apiClient.post<PublishedPluginVersionDto, FormData>('/plugins/publish', formData)
}

export function getPlugin(pluginId: string, signal?: AbortSignal): Promise<PluginDetailDto> {
  return apiClient.get<PluginDetailDto>(`/plugins/${encodeURIComponent(pluginId)}`, { signal })
}
