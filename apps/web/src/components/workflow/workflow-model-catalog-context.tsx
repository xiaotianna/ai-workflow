import type { ModelReferenceDisplayResolver } from '@ai-workflow/nodes-ui'
import { createContext, use, useEffect, useState, type PropsWithChildren } from 'react'

import { listModelGroups, type ModelGroupDto } from '@/api/models'
import { getModelProviderStrategy } from '@/features/models'

interface WorkflowModelCatalogContextValue {
  modelGroups: readonly ModelGroupDto[]
  loading: boolean
  loadError: boolean
  reload: () => void
  resolveModelReferenceDisplay?: ModelReferenceDisplayResolver
}

const WorkflowModelCatalogContext = createContext<WorkflowModelCatalogContextValue | null>(null)

export function WorkflowModelCatalogProvider({ children }: PropsWithChildren) {
  const [modelGroups, setModelGroups] = useState<readonly ModelGroupDto[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [reloadRevision, setReloadRevision] = useState(0)

  useEffect(() => {
    const controller = new AbortController()

    setLoading(true)
    setLoadError(false)

    void listModelGroups('chat', controller.signal)
      .then(({ items }) => setModelGroups(items))
      .catch(() => {
        if (!controller.signal.aborted) setLoadError(true)
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })

    return () => controller.abort()
  }, [reloadRevision])

  const resolveModelReferenceDisplay: ModelReferenceDisplayResolver | undefined =
    loading && modelGroups.length === 0
      ? undefined
      : (reference) => {
          const group = modelGroups.find((item) => item.id === reference.groupId)
          const model = group?.models.find((item) => item.id === reference.configuredModelId)

          if (!group || !model) return undefined

          const ProviderIcon = getModelProviderStrategy(group.providerType).icon

          return {
            groupName: group.name,
            modelName: model.displayName || model.modelId,
            providerIcon: <ProviderIcon aria-hidden />,
          }
        }

  return (
    <WorkflowModelCatalogContext
      value={{
        modelGroups,
        loading,
        loadError,
        reload: () => setReloadRevision((revision) => revision + 1),
        resolveModelReferenceDisplay,
      }}
    >
      {children}
    </WorkflowModelCatalogContext>
  )
}

export function useWorkflowModelCatalog(): WorkflowModelCatalogContextValue {
  const modelCatalog = use(WorkflowModelCatalogContext)

  if (!modelCatalog) {
    throw new Error('useWorkflowModelCatalog 必须在 WorkflowModelCatalogProvider 内使用')
  }

  return modelCatalog
}
