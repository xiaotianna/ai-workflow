import { useState } from 'react'

import {
  CreateBlankAppDialog,
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

  const normalizedQuery = search.trim().toLowerCase()
  const visibleApps = apps.filter((app) => {
    if (!normalizedQuery) return true
    return (
      app.title.toLowerCase().includes(normalizedQuery) ||
      app.kindLabel.toLowerCase().includes(normalizedQuery)
    )
  })

  function handleCreateApp(input: CreateStudioAppInput) {
    setApps((currentApps) => [
      {
        id: `local-${Date.now()}`,
        title: input.title,
        kind: 'workflow',
        kindLabel: '工作流',
        author: 'AI Workflow',
        editedAtLabel: editedAtFormatter.format(new Date()),
        description: input.description,
        icon: input.icon,
      },
      ...currentApps,
    ])
  }

  return (
    <div className="flex min-h-full flex-col">
      <div className="flex h-6 min-w-0 items-center">
        <div className="flex items-center">
          <h1 className="text-text-primary text-[18px] font-semibold">工作室</h1>
        </div>
      </div>

      <StudioToolbar
        search={search}
        onSearchChange={setSearch}
        onCreateBlankApp={() => setCreateDialogOpen(true)}
      />

      <CreateBlankAppDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onCreate={handleCreateApp}
      />

      <StudioAppGrid apps={visibleApps} onAppAction={onAppAction} />
    </div>
  )
}
