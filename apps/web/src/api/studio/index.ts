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
  executionKey: string
  attempt: number
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
