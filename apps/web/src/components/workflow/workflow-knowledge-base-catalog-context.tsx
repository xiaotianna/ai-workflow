import { listKnowledgeBases, type KnowledgeBaseDto } from '@/api/knowledge-bases'
import { createContext, use, type PropsWithChildren } from 'react'

import { useLazyWorkflowCatalog } from './use-lazy-workflow-catalog'

interface WorkflowKnowledgeBaseCatalogContextValue {
  knowledgeBases: readonly KnowledgeBaseDto[]
  loaded: boolean
  loading: boolean
  loadError: boolean
  load: () => void
  reload: () => void
}

const WorkflowKnowledgeBaseCatalogContext =
  createContext<WorkflowKnowledgeBaseCatalogContextValue | null>(null)

interface WorkflowKnowledgeBaseCatalogProviderProps extends PropsWithChildren {
  enabled?: boolean
}

export function WorkflowKnowledgeBaseCatalogProvider({
  children,
  enabled = true,
}: WorkflowKnowledgeBaseCatalogProviderProps) {
  const {
    items: knowledgeBases,
    load,
    loadError,
    loaded,
    loading,
    reload,
  } = useLazyWorkflowCatalog(loadKnowledgeBases, enabled)

  return (
    <WorkflowKnowledgeBaseCatalogContext
      value={{
        knowledgeBases,
        load,
        loaded,
        loading,
        loadError,
        reload,
      }}
    >
      {children}
    </WorkflowKnowledgeBaseCatalogContext>
  )
}

async function loadKnowledgeBases(signal: AbortSignal): Promise<readonly KnowledgeBaseDto[]> {
  const { items } = await listKnowledgeBases({ sort: 'updated_desc' }, signal)

  return items
}

export function useWorkflowKnowledgeBaseCatalog(): WorkflowKnowledgeBaseCatalogContextValue {
  const knowledgeBaseCatalog = use(WorkflowKnowledgeBaseCatalogContext)

  if (!knowledgeBaseCatalog) {
    throw new Error(
      'useWorkflowKnowledgeBaseCatalog 必须在 WorkflowKnowledgeBaseCatalogProvider 内使用',
    )
  }

  return knowledgeBaseCatalog
}
