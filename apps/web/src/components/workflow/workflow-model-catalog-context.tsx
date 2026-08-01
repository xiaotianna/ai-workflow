import { createContext, use, type PropsWithChildren } from 'react'

import { listModelGroups, type ModelGroupDto } from '@/api/models'

import { useLazyWorkflowCatalog } from './use-lazy-workflow-catalog'

interface WorkflowModelCatalogContextValue {
  modelGroups: readonly ModelGroupDto[]
  loaded: boolean
  loading: boolean
  loadError: boolean
  load: () => void
  reload: () => void
}

const WorkflowModelCatalogContext = createContext<WorkflowModelCatalogContextValue | null>(null)

interface WorkflowModelCatalogProviderProps extends PropsWithChildren {
  enabled?: boolean
}

export function WorkflowModelCatalogProvider({
  children,
  enabled = true,
}: WorkflowModelCatalogProviderProps) {
  const {
    items: modelGroups,
    load,
    loadError,
    loaded,
    loading,
    reload,
  } = useLazyWorkflowCatalog(loadChatModelGroups, enabled)

  return (
    <WorkflowModelCatalogContext
      value={{
        modelGroups,
        load,
        loaded,
        loading,
        loadError,
        reload,
      }}
    >
      {children}
    </WorkflowModelCatalogContext>
  )
}

async function loadChatModelGroups(signal: AbortSignal): Promise<readonly ModelGroupDto[]> {
  const { items } = await listModelGroups('chat', signal)

  return items
}

export function useWorkflowModelCatalog(): WorkflowModelCatalogContextValue {
  const modelCatalog = use(WorkflowModelCatalogContext)

  if (!modelCatalog) {
    throw new Error('useWorkflowModelCatalog 必须在 WorkflowModelCatalogProvider 内使用')
  }

  return modelCatalog
}
