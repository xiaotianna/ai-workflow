import { apiClient } from '@/api/client'

export type KnowledgeBaseSort = 'updated_desc' | 'created_desc' | 'created_asc'

export interface KnowledgeBaseDto {
  id: string
  title: string
  author: string
  description?: string
  icon?: string
  createdAt: string
  updatedAt: string
}

export interface KnowledgeBaseListResult {
  items: KnowledgeBaseDto[]
}

export interface ListKnowledgeBasesParams {
  search?: string
  sort?: KnowledgeBaseSort
}

export interface CreateKnowledgeBaseParams {
  title: string
  icon: string
  description?: string
}

export function listKnowledgeBases(
  params: ListKnowledgeBasesParams = {},
  signal?: AbortSignal,
): Promise<KnowledgeBaseListResult> {
  return apiClient.get<KnowledgeBaseListResult>('/knowledge-bases', {
    params,
    signal,
  })
}

export function getKnowledgeBase(
  knowledgeBaseId: string,
  signal?: AbortSignal,
): Promise<KnowledgeBaseDto> {
  return apiClient.get<KnowledgeBaseDto>(
    `/knowledge-bases/${encodeURIComponent(knowledgeBaseId)}`,
    { signal },
  )
}

export function createKnowledgeBase(values: CreateKnowledgeBaseParams): Promise<KnowledgeBaseDto> {
  return apiClient.post<KnowledgeBaseDto, CreateKnowledgeBaseParams>('/knowledge-bases', values)
}

export function updateKnowledgeBase(
  knowledgeBaseId: string,
  values: CreateKnowledgeBaseParams,
): Promise<KnowledgeBaseDto> {
  return apiClient.patch<KnowledgeBaseDto, CreateKnowledgeBaseParams>(
    `/knowledge-bases/${encodeURIComponent(knowledgeBaseId)}`,
    values,
  )
}

export function deleteKnowledgeBase(knowledgeBaseId: string): Promise<void> {
  return apiClient.delete<void>(`/knowledge-bases/${encodeURIComponent(knowledgeBaseId)}`)
}
