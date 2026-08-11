import { deleteKnowledgeBase, getKnowledgeBase, updateKnowledgeBase } from '@/api/knowledge-bases'
import { showToast } from '@ai-workflow/ui/lib/toast'
import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import { DetailLayout } from '@/components/detail-layout'
import {
  DeleteKnowledgeBaseDialog,
  EditKnowledgeBaseDialog,
  KnowledgeBaseDetailIdentity,
  KnowledgeBaseSidebarSummary,
  toKnowledgeBaseListItem,
  type CreateKnowledgeBaseInput,
  type KnowledgeBaseActionHandler,
  type KnowledgeBaseListItem,
} from '@/features/knowledge-base'
import { routes } from '@/router'
import { getNavigationItemsFromRoute } from '@/router/navigation'

type KnowledgeBaseResourceState =
  | {
      routeId: string | undefined
      status: 'loading' | 'error'
    }
  | {
      routeId: string
      status: 'success'
      knowledgeBase: KnowledgeBaseListItem
    }

export interface KnowledgeBaseDetailOutletContext {
  knowledgeBase: KnowledgeBaseListItem | undefined
  isResourceAvailable: boolean
}

export default function KnowledgeBaseDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [resourceState, setResourceState] = useState<KnowledgeBaseResourceState>({
    routeId: id,
    status: 'loading',
  })
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const encodedKnowledgeBaseId = encodeURIComponent(id ?? '')
  const knowledgeBase =
    resourceState.routeId === id && resourceState.status === 'success'
      ? resourceState.knowledgeBase
      : undefined
  const isResourceAvailable = knowledgeBase !== undefined

  useEffect(() => {
    if (!id) {
      setResourceState({ routeId: id, status: 'error' })
      return
    }

    const controller = new AbortController()
    setResourceState({ routeId: id, status: 'loading' })

    void getKnowledgeBase(id, controller.signal)
      .then((result) => {
        setResourceState({
          routeId: id,
          status: 'success',
          knowledgeBase: toKnowledgeBaseListItem(result),
        })
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setResourceState({ routeId: id, status: 'error' })
        }
      })

    return () => controller.abort()
  }, [id])

  async function handleUpdateKnowledgeBase(input: CreateKnowledgeBaseInput) {
    if (!knowledgeBase) return

    const updatedKnowledgeBase = await updateKnowledgeBase(knowledgeBase.id, {
      ...input,
      description: input.description ?? '',
    })
    setResourceState({
      routeId: id ?? knowledgeBase.id,
      status: 'success',
      knowledgeBase: toKnowledgeBaseListItem(updatedKnowledgeBase),
    })
    showToast('success', '知识库信息已保存')
  }

  async function handleDeleteKnowledgeBase() {
    if (!knowledgeBase) return

    await deleteKnowledgeBase(knowledgeBase.id)
    showToast('success', '知识库已删除')
    navigate('/knowledge-base', { replace: true })
  }

  function handleKnowledgeBaseAction(action: Parameters<KnowledgeBaseActionHandler>[0]) {
    if (action === 'edit') {
      setEditDialogOpen(true)
      return
    }

    setDeleteDialogOpen(true)
  }

  return (
    <>
      {knowledgeBase ? (
        <>
          <EditKnowledgeBaseDialog
            knowledgeBase={knowledgeBase}
            open={editDialogOpen}
            onOpenChange={setEditDialogOpen}
            onUpdate={handleUpdateKnowledgeBase}
          />
          <DeleteKnowledgeBaseDialog
            knowledgeBase={knowledgeBase}
            open={deleteDialogOpen}
            onOpenChange={setDeleteDialogOpen}
            onDelete={handleDeleteKnowledgeBase}
          />
        </>
      ) : undefined}

      <DetailLayout
        backTo="/knowledge-base"
        backLabel="知识库"
        resourceIdentity={
          <KnowledgeBaseDetailIdentity
            knowledgeBase={knowledgeBase}
            onKnowledgeBaseAction={handleKnowledgeBaseAction}
          />
        }
        navigationItems={getNavigationItemsFromRoute(
          routes,
          'knowledge-base-detail',
          `/knowledge-base/${encodedKnowledgeBaseId}`,
        )}
        navigationLabel="知识库导航"
        sidebarFooter={<KnowledgeBaseSidebarSummary knowledgeBaseId={id} />}
        outletContext={
          {
            knowledgeBase,
            isResourceAvailable,
          } satisfies KnowledgeBaseDetailOutletContext
        }
      />
    </>
  )
}
