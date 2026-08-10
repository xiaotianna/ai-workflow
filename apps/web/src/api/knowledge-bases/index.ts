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

export type KnowledgeSegmentationMode = 'GENERAL' | 'QA' | 'PARENT_CHILD'
export type KnowledgeRetrievalProfile = 'HYBRID_ACCURATE' | 'HYBRID_FAST'
export type KnowledgeDocumentFileType = 'pdf' | 'markdown' | 'text'
export type KnowledgeDocumentSort = 'uploaded_desc' | 'recall_desc' | 'character_desc' | 'name_asc'

export interface KnowledgeBaseSettingsDto {
  embeddingModelGroupId?: string
  embeddingConfiguredModelId?: string
  segmentationMode: KnowledgeSegmentationMode
  maxSegmentLength: number
  overlapLength: number
  normalizeWhitespace: boolean
  segmentationRevision: number
  retrievalProfile: KnowledgeRetrievalProfile
  retrievalTopK: number
  staleDocumentCount: number
  updatedAt: string
}

export interface UpdateKnowledgeBaseSettingsParams {
  embeddingModelGroupId: string | null
  embeddingConfiguredModelId: string | null
  segmentationMode: KnowledgeSegmentationMode
  maxSegmentLength: number
  overlapLength: number
  normalizeWhitespace: boolean
  retrievalProfile: KnowledgeRetrievalProfile
  retrievalTopK: number
}

export interface CreateKnowledgeDocumentsParams {
  files: File[]
  segmentationMode: KnowledgeSegmentationMode
  maxSegmentLength: number
  overlapLength: number
  normalizeWhitespace: boolean
}

export interface KnowledgeDocumentDto {
  id: string
  knowledgeBaseId: string
  name: string
  fileType: string
  sourceMimeType: string
  sourceSize: string
  segmentationMode: KnowledgeSegmentationMode
  maxSegmentLength: number
  overlapLength: number
  normalizeWhitespace: boolean
  status: 'PROCESSING' | 'READY' | 'FAILED'
  enabled: boolean
  characterCount: number
  chunkCount: number
  recallCount: number
  needsReindex: boolean
  errorMessage?: string
  createdAt: string
  updatedAt: string
}

export interface KnowledgeDocumentListDto {
  items: KnowledgeDocumentDto[]
  total: number
  page: number
  pageSize: number
}

export interface KnowledgeChunkDto {
  id: string
  sequence: number
  content: string
  characterCount: number
  tokenCount: number
  metadata: Record<string, unknown>
  createdAt: string
}

export interface KnowledgeChunkListDto {
  document: KnowledgeDocumentDto
  items: KnowledgeChunkDto[]
  total: number
  page: number
  pageSize: number
}

export interface KnowledgeRetrievalDocumentDto {
  chunkId: string
  documentId: string
  documentVersionId: string
  documentName: string
  sequence: number
  content: string
  metadata: Record<string, unknown>
  score: number
}

export interface KnowledgeRetrievalDto {
  documents: KnowledgeRetrievalDocumentDto[]
}

export interface KnowledgeDocumentPreviewDto {
  files: Array<{
    name: string
    total: number
    truncated: boolean
    items: Array<{
      sequence: number
      content: string
      characterCount: number
      metadata: Record<string, string | number>
    }>
  }>
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

export function getKnowledgeBaseSettings(
  knowledgeBaseId: string,
  signal?: AbortSignal,
): Promise<KnowledgeBaseSettingsDto> {
  return apiClient.get<KnowledgeBaseSettingsDto>(
    `/knowledge-bases/${encodeURIComponent(knowledgeBaseId)}/settings`,
    { signal },
  )
}

export function updateKnowledgeBaseSettings(
  knowledgeBaseId: string,
  values: UpdateKnowledgeBaseSettingsParams,
): Promise<KnowledgeBaseSettingsDto> {
  return apiClient.patch<KnowledgeBaseSettingsDto, UpdateKnowledgeBaseSettingsParams>(
    `/knowledge-bases/${encodeURIComponent(knowledgeBaseId)}/settings`,
    values,
  )
}

export function listKnowledgeDocuments(
  knowledgeBaseId: string,
  params: {
    search?: string
    fileType?: KnowledgeDocumentFileType
    sort?: KnowledgeDocumentSort
    page: number
    pageSize: number
  },
  signal?: AbortSignal,
): Promise<KnowledgeDocumentListDto> {
  return apiClient.get<KnowledgeDocumentListDto>(
    `/knowledge-bases/${encodeURIComponent(knowledgeBaseId)}/documents`,
    { params, signal },
  )
}

export function createKnowledgeDocuments(
  knowledgeBaseId: string,
  values: CreateKnowledgeDocumentsParams,
): Promise<KnowledgeDocumentDto[]> {
  const body = createDocumentsFormData(values)

  return apiClient.post<KnowledgeDocumentDto[], FormData>(
    `/knowledge-bases/${encodeURIComponent(knowledgeBaseId)}/documents`,
    body,
  )
}

export function getKnowledgeDocument(
  knowledgeBaseId: string,
  documentId: string,
  signal?: AbortSignal,
): Promise<KnowledgeDocumentDto> {
  return apiClient.get<KnowledgeDocumentDto>(
    `/knowledge-bases/${encodeURIComponent(knowledgeBaseId)}/documents/${encodeURIComponent(documentId)}`,
    { signal },
  )
}

export function previewKnowledgeDocuments(
  knowledgeBaseId: string,
  values: CreateKnowledgeDocumentsParams,
): Promise<KnowledgeDocumentPreviewDto> {
  return apiClient.post<KnowledgeDocumentPreviewDto, FormData>(
    `/knowledge-bases/${encodeURIComponent(knowledgeBaseId)}/documents/preview`,
    createDocumentsFormData(values),
  )
}

export function updateKnowledgeDocument(
  knowledgeBaseId: string,
  documentId: string,
  values: { name?: string; enabled?: boolean },
): Promise<KnowledgeDocumentDto> {
  return apiClient.patch<KnowledgeDocumentDto, typeof values>(
    `/knowledge-bases/${encodeURIComponent(knowledgeBaseId)}/documents/${encodeURIComponent(documentId)}`,
    values,
  )
}

export function deleteKnowledgeDocument(
  knowledgeBaseId: string,
  documentId: string,
): Promise<void> {
  return apiClient.delete<void>(
    `/knowledge-bases/${encodeURIComponent(knowledgeBaseId)}/documents/${encodeURIComponent(documentId)}`,
  )
}

export function reindexKnowledgeDocument(
  knowledgeBaseId: string,
  documentId: string,
): Promise<KnowledgeDocumentDto> {
  return apiClient.post<KnowledgeDocumentDto>(
    `/knowledge-bases/${encodeURIComponent(knowledgeBaseId)}/documents/${encodeURIComponent(documentId)}/reindex`,
  )
}

export function listKnowledgeChunks(
  knowledgeBaseId: string,
  documentId: string,
  params: { search?: string; page: number; pageSize: number },
  signal?: AbortSignal,
): Promise<KnowledgeChunkListDto> {
  return apiClient.get<KnowledgeChunkListDto>(
    `/knowledge-bases/${encodeURIComponent(knowledgeBaseId)}/documents/${encodeURIComponent(documentId)}/chunks`,
    { params, signal },
  )
}

export function retrieveKnowledgeBase(
  knowledgeBaseId: string,
  values: { query: string; topK: number },
): Promise<KnowledgeRetrievalDto> {
  return apiClient.post<KnowledgeRetrievalDto, typeof values>(
    `/knowledge-bases/${encodeURIComponent(knowledgeBaseId)}/retrieve`,
    values,
  )
}

function createDocumentsFormData(values: CreateKnowledgeDocumentsParams): FormData {
  const body = new FormData()
  values.files.forEach((file) => body.append('files', file))
  body.append('segmentationMode', values.segmentationMode)
  body.append('maxSegmentLength', String(values.maxSegmentLength))
  body.append('overlapLength', String(values.overlapLength))
  body.append('normalizeWhitespace', String(values.normalizeWhitespace))
  return body
}
