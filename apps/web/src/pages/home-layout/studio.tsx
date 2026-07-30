import { useState } from 'react'

import { PageContent } from '@/components/page-content'
import { PageHeaderActions } from '@/components/page-header-actions'
import { PageTitle } from '@/components/page-title'
import {
  CreateBlankAppDialog,
  ImportDslDialog,
  initialStudioApps,
  StudioAppGrid,
  StudioToolbar,
  type CreateStudioAppInput,
  type StudioAppActionHandler,
} from '@/features/studio'

const editedAtFormatter = new Intl.DateTimeFormat('zh-CN', {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
})

export interface StudioPageProps {
  onAppAction?: StudioAppActionHandler
}

export default function StudioPage({ onAppAction }: StudioPageProps) {
  const [apps, setApps] = useState(initialStudioApps)
  const [search, setSearch] = useState('')
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [importDialogOpen, setImportDialogOpen] = useState(false)

  const normalizedQuery = search.trim().toLowerCase()
  const visibleApps = apps.filter((app) => {
    if (!normalizedQuery) return true
    return app.title.toLowerCase().includes(normalizedQuery)
  })

  function handleCreateApp(input: CreateStudioAppInput) {
    setApps((currentApps) => [
      {
        id: `local-${Date.now()}`,
        title: input.title,
        author: 'AI Workflow',
        editedAtLabel: editedAtFormatter.format(new Date()),
        description: input.description,
        icon: input.icon,
      },
      ...currentApps,
    ])
  }

  function handleImportApp(file: File) {
    setApps((currentApps) => [
      {
        id: `local-import-${Date.now()}`,
        title: file.name.replace(/\.ya?ml$/i, ''),
        author: 'AI Workflow',
        editedAtLabel: editedAtFormatter.format(new Date()),
        description: `由 ${file.name} 导入`,
        icon: '📦',
      },
      ...currentApps,
    ])
  }

  return (
    <div className="flex min-h-full flex-col">
      <PageTitle title="工作室" />

      <PageHeaderActions>
        <StudioToolbar
          search={search}
          onSearchChange={setSearch}
          onCreateBlankApp={() => setCreateDialogOpen(true)}
          onImportApp={() => setImportDialogOpen(true)}
        />
      </PageHeaderActions>

      <CreateBlankAppDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onCreate={handleCreateApp}
      />

      <ImportDslDialog
        open={importDialogOpen}
        onOpenChange={setImportDialogOpen}
        onImport={handleImportApp}
      />

      <PageContent>
        <StudioAppGrid apps={visibleApps} onAppAction={onAppAction} />
      </PageContent>
    </div>
  )
}
