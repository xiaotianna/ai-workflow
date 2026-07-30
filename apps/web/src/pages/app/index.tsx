import { getStudioApp, updateStudioApp } from '@/api/studio'
import { showToast } from '@ai-workflow/ui/lib/toast'
import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'

import { DetailLayout } from '@/components/detail-layout'
import {
  AppDetailIdentity,
  downloadStudioAppDsl,
  EditStudioAppDialog,
  toStudioAppListItem,
  type CreateStudioAppInput,
  type StudioAppActionHandler,
  type StudioAppListItem,
} from '@/features/studio'
import { routes } from '@/router'
import { getNavigationItemsFromRoute } from '@/router/navigation'

export interface AppPageProps {
  onAppAction?: StudioAppActionHandler
  onImportDsl?: (file: File, app: StudioAppListItem) => void
}

export default function AppPage({ onAppAction, onImportDsl }: AppPageProps) {
  const { id } = useParams<{ id: string }>()
  const [app, setApp] = useState<StudioAppListItem>()
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const encodedAppId = encodeURIComponent(id ?? '')

  useEffect(() => {
    if (!id) return

    const controller = new AbortController()

    void getStudioApp(id, controller.signal)
      .then((result) => setApp(toStudioAppListItem(result)))
      .catch(() => undefined)

    return () => controller.abort()
  }, [id])

  async function handleUpdateApp(input: CreateStudioAppInput) {
    if (!app) return

    const updatedApp = await updateStudioApp(app.id, {
      ...input,
      description: input.description ?? '',
    })
    setApp(toStudioAppListItem(updatedApp))
    showToast('success', '应用信息已保存')
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

    onAppAction?.(action, selectedApp)
  }

  return (
    <>
      {app ? (
        <EditStudioAppDialog
          app={app}
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          onUpdate={handleUpdateApp}
        />
      ) : undefined}

      <DetailLayout
        backTo="/studio"
        backLabel="工作室"
        resourceIdentity={
          <AppDetailIdentity app={app} onAppAction={handleAppAction} onImportDsl={onImportDsl} />
        }
        navigationItems={getNavigationItemsFromRoute(routes, 'app', `/app/${encodedAppId}`)}
        navigationLabel="应用导航"
      />
    </>
  )
}
