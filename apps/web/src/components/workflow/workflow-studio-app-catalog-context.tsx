import { listStudioApps, type StudioAppDto } from '@/api/studio'
import { createContext, use, type PropsWithChildren } from 'react'

import { useLazyWorkflowCatalog } from './use-lazy-workflow-catalog'

interface WorkflowStudioAppCatalogContextValue {
  apps: readonly StudioAppDto[]
  currentAppId?: string
  currentWorkflowId?: string
  loaded: boolean
  loading: boolean
  loadError: boolean
  load: () => void
  reload: () => void
}

const WorkflowStudioAppCatalogContext = createContext<WorkflowStudioAppCatalogContextValue | null>(
  null,
)

interface WorkflowStudioAppCatalogProviderProps extends PropsWithChildren {
  currentAppId?: string
  currentWorkflowId?: string
  enabled?: boolean
}

export function WorkflowStudioAppCatalogProvider({
  children,
  currentAppId,
  currentWorkflowId,
  enabled = true,
}: WorkflowStudioAppCatalogProviderProps) {
  const {
    items: apps,
    load,
    loadError,
    loaded,
    loading,
    reload,
  } = useLazyWorkflowCatalog(loadStudioAppsCatalog, enabled)

  return (
    <WorkflowStudioAppCatalogContext
      value={{
        apps,
        currentAppId,
        currentWorkflowId,
        load,
        loaded,
        loading,
        loadError,
        reload,
      }}
    >
      {children}
    </WorkflowStudioAppCatalogContext>
  )
}

async function loadStudioAppsCatalog(signal: AbortSignal): Promise<readonly StudioAppDto[]> {
  const apps: StudioAppDto[] = []
  let cursor: string | undefined

  do {
    const result = await listStudioApps(
      {
        sort: 'updated_desc',
        limit: 50,
        publishedOnly: true,
        ...(cursor ? { cursor } : {}),
      },
      signal,
    )
    apps.push(...result.items)
    cursor = result.nextCursor ?? undefined
  } while (cursor)

  return apps
}

export function useWorkflowStudioAppCatalog(): WorkflowStudioAppCatalogContextValue {
  const catalog = use(WorkflowStudioAppCatalogContext)

  if (!catalog) {
    throw new Error('useWorkflowStudioAppCatalog 必须在 WorkflowStudioAppCatalogProvider 内使用')
  }

  return catalog
}
