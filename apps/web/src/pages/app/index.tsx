import { deleteStudioApp, duplicateStudioApp, getStudioApp, updateStudioApp } from '@/api/studio'
import { showToast } from '@ai-workflow/ui/lib/toast'
import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import { DetailLayout } from '@/components/detail-layout'
import {
  AppDetailIdentity,
  DeleteStudioAppDialog,
  downloadStudioAppDsl,
  EditStudioAppDialog,
  toStudioAppListItem,
  type CreateStudioAppInput,
  type StudioAppActionHandler,
  type StudioAppListItem,
} from '@/features/studio'
import { routes } from '@/router'
import { getNavigationItemsFromRoute } from '@/router/navigation'

type AppResourceState =
  | {
      routeId: string | undefined
      status: 'loading' | 'error'
    }
  | {
      routeId: string
      status: 'success'
      app: StudioAppListItem
    }

export interface AppDetailOutletContext {
  isResourceAvailable: boolean
}

export interface AppPageProps {
  onAppAction?: StudioAppActionHandler
  onImportDsl?: (dsl: unknown, app: StudioAppListItem) => unknown | Promise<unknown>
}

export default function AppPage({ onAppAction, onImportDsl }: AppPageProps) {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [resourceState, setResourceState] = useState<AppResourceState>({
    routeId: id,
    status: 'loading',
  })
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const encodedAppId = encodeURIComponent(id ?? '')
  const app =
    resourceState.routeId === id && resourceState.status === 'success'
      ? resourceState.app
      : undefined
  const isResourceAvailable = app !== undefined

  useEffect(() => {
    if (!id) {
      setResourceState({ routeId: id, status: 'error' })
      return
    }

    const controller = new AbortController()
    setResourceState({ routeId: id, status: 'loading' })

    void getStudioApp(id, controller.signal)
      .then((result) => {
        setResourceState({
          routeId: id,
          status: 'success',
          app: toStudioAppListItem(result),
        })
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setResourceState({ routeId: id, status: 'error' })
        }
      })

    return () => controller.abort()
  }, [id])

  async function handleUpdateApp(input: CreateStudioAppInput) {
    if (!app) return

    const updatedApp = await updateStudioApp(app.id, {
      ...input,
      description: input.description ?? '',
    })
    setResourceState({
      routeId: id ?? app.id,
      status: 'success',
      app: toStudioAppListItem(updatedApp),
    })
    showToast('success', '应用信息已保存')
  }

  async function handleDeleteApp() {
    if (!app) return

    await deleteStudioApp(app.id)
    showToast('success', '工作流已删除')
    navigate('/studio', { replace: true })
  }

  function handleAppAction(
    action: Parameters<StudioAppActionHandler>[0],
    selectedApp: StudioAppListItem,
  ) {
    if (action === 'edit') {
      setEditDialogOpen(true)
      return
    }

    if (action === 'export-dsl') {
      void downloadStudioAppDsl(selectedApp).catch(() => undefined)
      return
    }

    if (action === 'duplicate') {
      void duplicateStudioApp(selectedApp.id)
        .then((duplicatedApp) => {
          showToast('success', `已创建 ${duplicatedApp.title}`)
        })
        .catch(() => undefined)
      return
    }

    if (action === 'delete') {
      setDeleteDialogOpen(true)
      return
    }

    onAppAction?.(action, selectedApp)
  }

  return (
    <>
      {app ? (
        <>
          <EditStudioAppDialog
            app={app}
            open={editDialogOpen}
            onOpenChange={setEditDialogOpen}
            onUpdate={handleUpdateApp}
          />
          <DeleteStudioAppDialog
            app={app}
            open={deleteDialogOpen}
            onOpenChange={setDeleteDialogOpen}
            onDelete={handleDeleteApp}
          />
        </>
      ) : undefined}

      <DetailLayout
        backTo="/studio"
        backLabel="工作室"
        resourceIdentity={
          <AppDetailIdentity app={app} onAppAction={handleAppAction} onImportDsl={onImportDsl} />
        }
        navigationItems={getNavigationItemsFromRoute(routes, 'app', `/app/${encodedAppId}`)}
        navigationLabel="应用导航"
        outletContext={{ isResourceAvailable } satisfies AppDetailOutletContext}
      />
    </>
  )
}
