import { FileUp } from 'lucide-react'
import { useState } from 'react'

import {
  CreateBlankAppDialog,
  ImportAppDialog,
  initialStudioApps,
  StudioAppGrid,
  StudioToolbar,
  type CreateStudioAppInput,
} from '@/features/studio'

const editedAtFormatter = new Intl.DateTimeFormat('zh-CN', {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
})

export default function StudioPage() {
  const [apps, setApps] = useState(initialStudioApps)
  const [search, setSearch] = useState('')
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [importDialogOpen, setImportDialogOpen] = useState(false)

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

  function handleImportApp(file: File) {
    setApps((currentApps) => [
      {
        id: `local-import-${Date.now()}`,
        title: file.name.replace(/\.ya?ml$/i, ''),
        kind: 'workflow',
        kindLabel: '工作流',
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
      <div className="flex h-6 min-w-0 items-center">
        <div className="flex items-center">
          <h1 className="text-text-primary text-[18px] font-semibold">工作室</h1>
        </div>
      </div>

      <StudioToolbar
        search={search}
        onSearchChange={setSearch}
        onCreateBlankApp={() => setCreateDialogOpen(true)}
        onImportApp={() => setImportDialogOpen(true)}
      />

      <CreateBlankAppDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onCreate={handleCreateApp}
      />

      <ImportAppDialog
        open={importDialogOpen}
        onOpenChange={setImportDialogOpen}
        onImport={handleImportApp}
      />

      <StudioAppGrid apps={visibleApps} />

      <p className="text-muted-foreground mt-auto flex items-center justify-center gap-1.5 px-8 pt-10 pb-2 text-xs">
        <FileUp className="size-3.5 shrink-0 opacity-80" />
        拖放 DSL 文件到此处创建应用
      </p>
    </div>
  )
}
