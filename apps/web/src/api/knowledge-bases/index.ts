import { apiClient } from '@/api/client'

export type KnowledgeBaseSort = 'updated_desc' | 'created_desc' | 'created_asc'
export type KnowledgeSegmentationMode = 'GENERAL' | 'QA' | 'PARENT_CHILD'

export interface KnowledgeBaseDto {
  id: string
  title: string
  author: string
  segmentationMode: KnowledgeSegmentationMode
  description?: string
  icon?: string
  createdAt: string
  updatedAt: string
}

export interface KnowledgeBaseListResult {
  items: KnowledgeBaseDto[]
}

export interface KnowledgeBaseStatisticsDto {
  documentCount: number
  relatedAppCount: number
}

export interface KnowledgeApiOverviewDto {
  enabled: boolean
}

export interface KnowledgeApiKeyDto {
  id: string
  maskedKey: string
  scopes: string[]
  createdAt: string
  lastUsedAt?: string
}

export interface CreatedKnowledgeApiKeyDto extends KnowledgeApiKeyDto {
  key: string
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

export type KnowledgeRetrievalProfile = 'HYBRID_ACCURATE' | 'HYBRID_FAST'
export type KnowledgeDocumentFileType =
  | 'pdf'
  | 'markdown'
  | 'text'
  | 'docx'
  | 'pptx'
  | 'xlsx'
  | 'csv'
  | 'html'
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

export interface KnowledgeBaseIndexDto {
  id: string
  generation: number
  configuredModelId: string
  embeddingProvider: string
  embeddingModelId: string
  embeddingDimension?: number
  embeddingSpaceKey?: string
  distanceMetric: 'COSINE' | 'EUCLIDEAN' | 'INNER_PRODUCT'
  configHash: string
  status: 'BUILDING' | 'READY' | 'FAILED' | 'CANCELLED'
  active: boolean
  errorCode?: string
  errorMessage?: string
  createdAt: string
  readyAt?: string
  activatedAt?: string
  retiredAt?: string
}

export interface KnowledgeBaseIndexListDto {
  items: KnowledgeBaseIndexDto[]
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
  metadata: Record<string, string | number>
  recallCount: number
  needsReindex: boolean
  errorMessage?: string
  createdAt: string
  updatedAt: string
}

export type KnowledgeMetadataFieldType = 'string' | 'number' | 'time'

export interface KnowledgeMetadataFieldDto {
  id: string
  name: string
  type: KnowledgeMetadataFieldType
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
  recallCount: number
  enabled: boolean
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
  bm25Rank?: number
  denseRank?: number
  bm25Score?: number
  denseScore?: number
  rrfRank?: number
  rrfScore?: number
  rerankScore?: number
}

export interface KnowledgeRetrievalDto {
  profile: KnowledgeRetrievalProfile
  profileVersion: string
  scoreType: 'rerank' | 'rrf'
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

export function getKnowledgeBaseStatistics(
  knowledgeBaseId: string,
  signal?: AbortSignal,
): Promise<KnowledgeBaseStatisticsDto> {
  return apiClient.get<KnowledgeBaseStatisticsDto>(
    `/knowledge-bases/${encodeURIComponent(knowledgeBaseId)}/statistics`,
    { signal },
  )
}

export function getKnowledgeApiOverview(
  knowledgeBaseId: string,
  signal?: AbortSignal,
): Promise<KnowledgeApiOverviewDto> {
  return apiClient.get<KnowledgeApiOverviewDto>(
    `/knowledge-bases/${encodeURIComponent(knowledgeBaseId)}/api`,
    { signal },
  )
}

export function updateKnowledgeApiAccess(
  knowledgeBaseId: string,
  enabled: boolean,
): Promise<KnowledgeApiOverviewDto> {
  return apiClient.patch<KnowledgeApiOverviewDto, { enabled: boolean }>(
    `/knowledge-bases/${encodeURIComponent(knowledgeBaseId)}/api`,
    { enabled },
  )
}

export function listKnowledgeApiKeys(knowledgeBaseId: string): Promise<KnowledgeApiKeyDto[]> {
  return apiClient.get<KnowledgeApiKeyDto[]>(
    `/knowledge-bases/${encodeURIComponent(knowledgeBaseId)}/api/keys`,
  )
}

export function createKnowledgeApiKey(knowledgeBaseId: string): Promise<CreatedKnowledgeApiKeyDto> {
  return apiClient.post<CreatedKnowledgeApiKeyDto>(
    `/knowledge-bases/${encodeURIComponent(knowledgeBaseId)}/api/keys`,
  )
}

export function revokeKnowledgeApiKey(knowledgeBaseId: string, apiKeyId: string): Promise<void> {
  return apiClient.delete<void>(
    `/knowledge-bases/${encodeURIComponent(knowledgeBaseId)}/api/keys/${encodeURIComponent(apiKeyId)}`,
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

export function listKnowledgeBaseIndexes(
  knowledgeBaseId: string,
  signal?: AbortSignal,
): Promise<KnowledgeBaseIndexListDto> {
  return apiClient.get<KnowledgeBaseIndexListDto>(
    `/knowledge-bases/${encodeURIComponent(knowledgeBaseId)}/indexes`,
    { signal },
  )
}

export function rebuildKnowledgeBaseIndex(knowledgeBaseId: string): Promise<KnowledgeBaseIndexDto> {
  return apiClient.post<KnowledgeBaseIndexDto>(
    `/knowledge-bases/${encodeURIComponent(knowledgeBaseId)}/indexes/rebuild`,
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
  params: {
    search?: string
    status?: 'enabled' | 'disabled'
    page: number
    pageSize: number
  },
  signal?: AbortSignal,
): Promise<KnowledgeChunkListDto> {
  return apiClient.get<KnowledgeChunkListDto>(
    `/knowledge-bases/${encodeURIComponent(knowledgeBaseId)}/documents/${encodeURIComponent(documentId)}/chunks`,
    { params, signal },
  )
}

export function updateKnowledgeChunk(
  knowledgeBaseId: string,
  documentId: string,
  chunkId: string,
  values: { content?: string; enabled?: boolean },
): Promise<KnowledgeChunkDto> {
  return apiClient.patch<KnowledgeChunkDto, typeof values>(
    `/knowledge-bases/${encodeURIComponent(knowledgeBaseId)}/documents/${encodeURIComponent(documentId)}/chunks/${encodeURIComponent(chunkId)}`,
    values,
  )
}

export function createKnowledgeChunk(
  knowledgeBaseId: string,
  documentId: string,
  values: { content: string },
): Promise<KnowledgeChunkDto> {
  return apiClient.post<KnowledgeChunkDto, typeof values>(
    `/knowledge-bases/${encodeURIComponent(knowledgeBaseId)}/documents/${encodeURIComponent(documentId)}/chunks`,
    values,
  )
}

export function listKnowledgeMetadataFields(
  knowledgeBaseId: string,
  signal?: AbortSignal,
): Promise<KnowledgeMetadataFieldDto[]> {
  return apiClient.get<KnowledgeMetadataFieldDto[]>(
    `/knowledge-bases/${encodeURIComponent(knowledgeBaseId)}/metadata-fields`,
    { signal },
  )
}

export function createKnowledgeMetadataField(
  knowledgeBaseId: string,
  values: { name: string; type: KnowledgeMetadataFieldType },
): Promise<KnowledgeMetadataFieldDto> {
  return apiClient.post<KnowledgeMetadataFieldDto, typeof values>(
    `/knowledge-bases/${encodeURIComponent(knowledgeBaseId)}/metadata-fields`,
    values,
  )
}

export function updateKnowledgeMetadataField(
  knowledgeBaseId: string,
  fieldId: string,
  values: { name?: string; type?: KnowledgeMetadataFieldType },
): Promise<KnowledgeMetadataFieldDto> {
  return apiClient.patch<KnowledgeMetadataFieldDto, typeof values>(
    `/knowledge-bases/${encodeURIComponent(knowledgeBaseId)}/metadata-fields/${encodeURIComponent(fieldId)}`,
    values,
  )
}

export function deleteKnowledgeMetadataField(
  knowledgeBaseId: string,
  fieldId: string,
): Promise<void> {
  return apiClient.delete<void>(
    `/knowledge-bases/${encodeURIComponent(knowledgeBaseId)}/metadata-fields/${encodeURIComponent(fieldId)}`,
  )
}

export function updateKnowledgeDocumentMetadata(
  knowledgeBaseId: string,
  documentId: string,
  values: Record<string, string | number>,
): Promise<KnowledgeDocumentDto> {
  return apiClient.put<KnowledgeDocumentDto, { values: typeof values }>(
    `/knowledge-bases/${encodeURIComponent(knowledgeBaseId)}/documents/${encodeURIComponent(documentId)}/metadata`,
    { values },
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
