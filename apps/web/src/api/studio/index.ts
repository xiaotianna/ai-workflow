import { apiClient, type SseMessage } from '@/api/client'
import type { WorkflowEditorSnapshot } from '@/components/workflow/types'

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
  publishedOnly?: boolean
}

export interface StudioSubWorkflowContractDto {
  workflowId: string
  versionId: string
  version: number
  publishedAt: string
  inputVariables: WorkflowEditorSnapshot['workflow']['nodes'][number]['outputs']
  outputVariables: Array<{
    key: string
    label: string
    dataType: WorkflowEditorSnapshot['workflow']['outputs'][number]['dataType']
    description?: string
  }>
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

export interface StudioWorkflowDraftDto {
  schemaVersion: number
  revision: number
  definition: WorkflowEditorSnapshot['workflow']
  layout: WorkflowEditorSnapshot['layout']
  updatedAt: string
}

export interface SaveStudioWorkflowDraftParams {
  revision: number
  definition: WorkflowEditorSnapshot['workflow']
  layout: WorkflowEditorSnapshot['layout']
}

export interface StudioWorkflowDeploymentDto {
  versionId: string
  version: number
  publishedAt: string
}

export interface PublishStudioWorkflowParams {
  definition: WorkflowEditorSnapshot['workflow']
  layout: WorkflowEditorSnapshot['layout']
}

export interface StudioWorkflowVersionDto {
  id: string
  version: number
  name?: string
  createdAt: string
  createdBy?: {
    id: string
    username: string
  }
}

export interface StudioWorkflowVersionListResult {
  items: StudioWorkflowVersionDto[]
}

export interface RenameStudioWorkflowVersionParams {
  name: string
}

export type StudioWorkflowTestRunMode = 'FULL' | 'SINGLE_NODE'

export interface CreateStudioWorkflowTestRunParams {
  mode: StudioWorkflowTestRunMode
  targetNodeId?: string
  definition: WorkflowEditorSnapshot['workflow']
  layout: WorkflowEditorSnapshot['layout']
  input?: Record<string, unknown>
}

export interface StudioWorkflowNodeRunDto {
  id: string
  nodeId: string
  nodeType: string
  status: string
  input?: unknown
  output?: unknown
  startedAt?: string
  finishedAt?: string
  durationMs?: number
  error?: {
    code: string
    message: string
    details?: unknown
  }
}

export type StudioWorkflowNodeExecutionStatus = 'RUNNING' | 'SUCCEEDED' | 'FAILED'

export interface StudioWorkflowNodeExecutionStateDto {
  nodeId: string
  status: StudioWorkflowNodeExecutionStatus
}

export interface StudioWorkflowTestRunDto {
  id: string
  traceId: string
  trigger: string
  mode: StudioWorkflowTestRunMode
  targetNodeId?: string
  status: string
  input: unknown
  output?: unknown
  queuedAt: string
  startedAt?: string
  finishedAt?: string
  durationMs?: number
  triggeredBy?: {
    id: string
    username: string
  }
  error?: {
    code: string
    message: string
    details?: unknown
  }
  nodeRuns: StudioWorkflowNodeRunDto[]
  nodeStates: StudioWorkflowNodeExecutionStateDto[]
  traceNodeDurations?: Record<string, number>
  traceNodeIds?: string[]
}

export interface StudioWorkflowRunListItemDto {
  id: string
  trigger: string
  mode: StudioWorkflowTestRunMode
  status: string
  queuedAt: string
  startedAt?: string
  finishedAt?: string
  durationMs?: number
  triggeredBy?: {
    id: string
    username: string
  }
}

export interface StudioWorkflowRunListResult {
  items: StudioWorkflowRunListItemDto[]
  nextCursor: string | null
}

export interface ListStudioWorkflowRunsParams {
  cursor?: string
  limit?: number
}

export interface StudioWorkflowRunDetailDto extends StudioWorkflowTestRunDto {
  definition: WorkflowEditorSnapshot['workflow']
}

export type StudioWorkflowTestRunSseEvent =
  | {
      event: 'workflow_started'
      data: StudioWorkflowTestRunDto
    }
  | {
      event: 'node_finished'
      data: {
        runId: string
        node: StudioWorkflowNodeExecutionStateDto
        nodeRuns?: StudioWorkflowNodeRunDto[]
        nodeStates: StudioWorkflowNodeExecutionStateDto[]
        traceNodeDurations?: Record<string, number>
        traceNodeIds?: string[]
      }
    }
  | {
      event: 'workflow_finished'
      data: StudioWorkflowTestRunDto
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

export function getStudioWorkflowDraft(
  appId: string,
  signal?: AbortSignal,
): Promise<StudioWorkflowDraftDto> {
  return apiClient.get<StudioWorkflowDraftDto>(
    `/studio/apps/${encodeURIComponent(appId)}/workflow-draft`,
    {
      signal,
    },
  )
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

export function saveStudioWorkflowDraft(
  appId: string,
  values: SaveStudioWorkflowDraftParams,
): Promise<StudioWorkflowDraftDto> {
  return apiClient.put<StudioWorkflowDraftDto, SaveStudioWorkflowDraftParams>(
    `/studio/apps/${encodeURIComponent(appId)}/workflow-draft`,
    values,
  )
}

export function getStudioWorkflowDeployment(
  appId: string,
  signal?: AbortSignal,
): Promise<StudioWorkflowDeploymentDto | null> {
  return apiClient.get<StudioWorkflowDeploymentDto | null>(
    `/studio/apps/${encodeURIComponent(appId)}/workflow-deployment`,
    { signal },
  )
}

export function getStudioSubWorkflowContract(
  appId: string,
  signal?: AbortSignal,
): Promise<StudioSubWorkflowContractDto> {
  return apiClient.get<StudioSubWorkflowContractDto>(
    `/studio/apps/${encodeURIComponent(appId)}/workflow-deployment/contract`,
    { signal },
  )
}

export function publishStudioWorkflow(
  appId: string,
  values: PublishStudioWorkflowParams,
): Promise<StudioWorkflowDeploymentDto> {
  return apiClient.post<StudioWorkflowDeploymentDto, PublishStudioWorkflowParams>(
    `/studio/apps/${encodeURIComponent(appId)}/workflow-deployment`,
    values,
  )
}

export function listStudioWorkflowVersions(
  appId: string,
  signal?: AbortSignal,
): Promise<StudioWorkflowVersionListResult> {
  return apiClient.get<StudioWorkflowVersionListResult>(
    `/studio/apps/${encodeURIComponent(appId)}/workflow-versions`,
    { signal },
  )
}

export function restoreStudioWorkflowVersion(
  appId: string,
  versionId: string,
): Promise<StudioWorkflowDraftDto> {
  return apiClient.post<StudioWorkflowDraftDto>(
    `/studio/apps/${encodeURIComponent(appId)}/workflow-versions/${encodeURIComponent(versionId)}/restore`,
  )
}

export function renameStudioWorkflowVersion(
  appId: string,
  versionId: string,
  values: RenameStudioWorkflowVersionParams,
): Promise<StudioWorkflowVersionDto> {
  return apiClient.patch<StudioWorkflowVersionDto, RenameStudioWorkflowVersionParams>(
    `/studio/apps/${encodeURIComponent(appId)}/workflow-versions/${encodeURIComponent(versionId)}`,
    values,
  )
}

export function deleteStudioWorkflowVersion(appId: string, versionId: string): Promise<void> {
  return apiClient.delete<void>(
    `/studio/apps/${encodeURIComponent(appId)}/workflow-versions/${encodeURIComponent(versionId)}`,
  )
}

export function listStudioWorkflowRuns(
  appId: string,
  params: ListStudioWorkflowRunsParams,
  signal?: AbortSignal,
): Promise<StudioWorkflowRunListResult> {
  return apiClient.get<StudioWorkflowRunListResult>(
    `/studio/apps/${encodeURIComponent(appId)}/workflow-runs`,
    {
      params,
      signal,
    },
  )
}

export function getStudioWorkflowRun(
  appId: string,
  runId: string,
  signal?: AbortSignal,
): Promise<StudioWorkflowRunDetailDto> {
  return apiClient.get<StudioWorkflowRunDetailDto>(
    `/studio/apps/${encodeURIComponent(appId)}/workflow-runs/${encodeURIComponent(runId)}`,
    { signal },
  )
}

export function streamStudioWorkflowTestRun(
  appId: string,
  values: CreateStudioWorkflowTestRunParams,
  onEvent: (event: StudioWorkflowTestRunSseEvent) => void,
  signal?: AbortSignal,
): Promise<void> {
  return apiClient.postSse(`/studio/apps/${encodeURIComponent(appId)}/workflow-runs/test`, values, {
    signal,
    onMessage: createWorkflowTestRunMessageHandler(onEvent),
  })
}

export function resumeStudioWorkflowTestRun(
  appId: string,
  runId: string,
  onEvent: (event: StudioWorkflowTestRunSseEvent) => void,
  signal?: AbortSignal,
): Promise<void> {
  return apiClient.getSse(
    `/studio/apps/${encodeURIComponent(appId)}/workflow-runs/${encodeURIComponent(runId)}/events`,
    {
      signal,
      onMessage: createWorkflowTestRunMessageHandler(onEvent),
    },
  )
}

export function cancelStudioWorkflowTestRun(
  appId: string,
  runId: string,
): Promise<StudioWorkflowTestRunDto> {
  return apiClient.post<StudioWorkflowTestRunDto>(
    `/studio/apps/${encodeURIComponent(appId)}/workflow-runs/${encodeURIComponent(runId)}/cancel`,
  )
}

function createWorkflowTestRunMessageHandler(
  onEvent: (event: StudioWorkflowTestRunSseEvent) => void,
): (message: SseMessage) => void {
  return (message) => {
    const data = JSON.parse(message.data) as unknown

    if (
      message.event === 'workflow_started' ||
      message.event === 'node_finished' ||
      message.event === 'workflow_finished'
    ) {
      onEvent({ event: message.event, data } as StudioWorkflowTestRunSseEvent)
      return
    }

    if (message.event === 'error') {
      const error = data as { message?: unknown }
      throw new Error(
        typeof error.message === 'string' && error.message.trim()
          ? error.message
          : '运行事件流异常',
      )
    }
  }
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
