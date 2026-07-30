import { apiClient } from '@/api/client'

export type StudioAppSort = 'updated_desc' | 'created_desc' | 'created_asc'

export interface StudioAppDto {
  id: string
  title: string
  author: string
  description?: string
  icon?: string
  createdAt: string
  updatedAt: string
}

export interface StudioAppListResult {
  items: StudioAppDto[]
  nextCursor: string | null
}

export interface ListStudioAppsParams {
  cursor?: string
  limit?: number
  search?: string
  sort?: StudioAppSort
}

export interface SaveStudioAppParams {
  title: string
  icon: string
  description?: string
}

export interface ExportedStudioAppDsl {
  blob: Blob
  filename?: string
}

export function listStudioApps(
  params: ListStudioAppsParams,
  signal?: AbortSignal,
): Promise<StudioAppListResult> {
  return apiClient.get<StudioAppListResult>('/studio/apps', {
    params,
    signal,
  })
}

export function getStudioApp(appId: string, signal?: AbortSignal): Promise<StudioAppDto> {
  return apiClient.get<StudioAppDto>(`/studio/apps/${encodeURIComponent(appId)}`, {
    signal,
  })
}

export function createStudioApp(values: SaveStudioAppParams): Promise<StudioAppDto> {
  return apiClient.post<StudioAppDto, SaveStudioAppParams>('/studio/apps', values)
}

export function importStudioApp(dsl: unknown): Promise<StudioAppDto> {
  return apiClient.post<StudioAppDto, unknown>('/studio/apps/import', dsl)
}

export function duplicateStudioApp(appId: string): Promise<StudioAppDto> {
  return apiClient.post<StudioAppDto>(`/studio/apps/${encodeURIComponent(appId)}/duplicate`)
}

export function deleteStudioApp(appId: string): Promise<void> {
  return apiClient.delete<void>(`/studio/apps/${encodeURIComponent(appId)}`)
}

export function updateStudioApp(appId: string, values: SaveStudioAppParams): Promise<StudioAppDto> {
  return apiClient.patch<StudioAppDto, SaveStudioAppParams>(
    `/studio/apps/${encodeURIComponent(appId)}`,
    values,
  )
}

export async function exportStudioAppDsl(appId: string): Promise<ExportedStudioAppDsl> {
  const response = await apiClient.getBlob(`/studio/apps/${encodeURIComponent(appId)}/dsl`)

  return {
    blob: response.data,
    filename: getDownloadFilename(response.headers['content-disposition']),
  }
}

function getDownloadFilename(contentDisposition: unknown): string | undefined {
  if (typeof contentDisposition !== 'string') return undefined

  const encodedFilename = contentDisposition.match(/filename\*=UTF-8''([^;]+)/i)?.[1]

  if (encodedFilename) {
    try {
      return decodeURIComponent(encodedFilename)
    } catch {
      return encodedFilename
    }
  }

  return contentDisposition.match(/filename="?([^";]+)"?/i)?.[1]
}
