import { listKnowledgeBases, type KnowledgeBaseDto } from '@/api/knowledge-bases'
import { createContext, use, useEffect, useState, type PropsWithChildren } from 'react'

interface WorkflowKnowledgeBaseCatalogContextValue {
  knowledgeBases: readonly KnowledgeBaseDto[]
  loading: boolean
  loadError: boolean
  reload: () => void
}

const WorkflowKnowledgeBaseCatalogContext =
  createContext<WorkflowKnowledgeBaseCatalogContextValue | null>(null)

export function WorkflowKnowledgeBaseCatalogProvider({ children }: PropsWithChildren) {
  const [knowledgeBases, setKnowledgeBases] = useState<readonly KnowledgeBaseDto[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [reloadRevision, setReloadRevision] = useState(0)

  useEffect(() => {
    const controller = new AbortController()

    setLoading(true)
    setLoadError(false)

    void listKnowledgeBases({ sort: 'updated_desc' }, controller.signal)
      .then(({ items }) => setKnowledgeBases(items))
      .catch(() => {
        if (!controller.signal.aborted) setLoadError(true)
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })

    return () => controller.abort()
  }, [reloadRevision])

  return (
    <WorkflowKnowledgeBaseCatalogContext
      value={{
        knowledgeBases,
        loading,
        loadError,
        reload: () => setReloadRevision((revision) => revision + 1),
      }}
    >
      {children}
    </WorkflowKnowledgeBaseCatalogContext>
  )
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
