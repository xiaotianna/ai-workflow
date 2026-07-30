import { useState } from 'react'

import { ResourceIdentity } from '@/components/resource-identity'

import { getStudioAppActions } from './studio-app-actions'
import { ImportDslDialog } from './import-dsl-dialog'
import { StudioAppActionMenu } from './studio-app-action-menu'
import type { StudioAppActionHandler, StudioAppListItem } from '../types'

interface AppDetailIdentityProps {
  app?: StudioAppListItem
  onAppAction?: StudioAppActionHandler
  onImportDsl?: (file: File, app: StudioAppListItem) => void
}

export function AppDetailIdentity({ app, onAppAction, onImportDsl }: AppDetailIdentityProps) {
  const [importDialogOpen, setImportDialogOpen] = useState(false)
  const title = app?.title ?? '未命名应用'
  const actions = app
    ? getStudioAppActions(app, onAppAction, {
        onImportDsl: () => setImportDialogOpen(true),
      })
    : []

  function handleImportDsl(file: File) {
    if (!app) return
    onImportDsl?.(file, app)
  }

  return (
    <>
      <ImportDslDialog
        open={importDialogOpen}
        onOpenChange={setImportDialogOpen}
        onImport={handleImportDsl}
      />

      <ResourceIdentity
        title={title}
        kindLabel="工作流"
        icon={<span aria-hidden>{app?.icon ?? '🤖'}</span>}
        actions={<StudioAppActionMenu title={title} actions={actions} />}
      />
    </>
  )
}
