import { createStudioApp, updateStudioApp } from '@/api/studio'
import { showToast } from '@ai-workflow/ui/lib/toast'
import { useState } from 'react'

import { PageContent } from '@/components/page-content'
import { PageHeaderActions } from '@/components/page-header-actions'
import { PageTitle } from '@/components/page-title'
import {
  CreateBlankAppDialog,
  downloadStudioAppDsl,
  EditStudioAppDialog,
  ImportDslDialog,
  StudioAppGrid,
  StudioToolbar,
  type CreateStudioAppInput,
  type StudioAppActionHandler,
  type StudioAppListItem,
  useStudioApps,
} from '@/features/studio'

export interface StudioPageProps {
  onAppAction?: StudioAppActionHandler
}

export default function StudioPage({ onAppAction }: StudioPageProps) {
  const {
    apps,
    hasMore,
    initialError,
    initialLoading,
    loadMore,
    loadMoreError,
    loadingMore,
    refresh,
    retryLoadMore,
    search,
    setSearch,
    setSort,
    sort,
  } = useStudioApps()
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [importDialogOpen, setImportDialogOpen] = useState(false)
  const [editingApp, setEditingApp] = useState<StudioAppListItem>()

  async function handleCreateApp(input: CreateStudioAppInput) {
    await createStudioApp(input)
    refresh()
    showToast('success', '应用已创建')
  }

  async function handleUpdateApp(input: CreateStudioAppInput) {
    if (!editingApp) return

    await updateStudioApp(editingApp.id, {
      ...input,
      description: input.description ?? '',
    })
    refresh()
    showToast('success', '应用信息已保存')
  }

  function handleImportApp(_file: File) {
    showToast('warning', '当前后端暂未提供 DSL 导入接口')
  }

  function handleAppAction(action: Parameters<StudioAppActionHandler>[0], app: StudioAppListItem) {
    if (action === 'edit') {
      setEditingApp(app)
      return
    }

    if (action === 'export-dsl') {
      void downloadStudioAppDsl(app).catch(() => undefined)
      return
    }

    onAppAction?.(action, app)
  }

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <PageTitle title="工作室" />

      <PageHeaderActions>
        <StudioToolbar
          search={search}
          sort={sort}
          onSearchChange={setSearch}
          onSortChange={setSort}
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

      {editingApp ? (
        <EditStudioAppDialog
          app={editingApp}
          open
          onOpenChange={(open) => {
            if (!open) setEditingApp(undefined)
          }}
          onUpdate={handleUpdateApp}
        />
      ) : undefined}

      <PageContent className="overflow-hidden">
        <StudioAppGrid
          apps={apps}
          hasMore={hasMore}
          initialError={initialError}
          initialLoading={initialLoading}
          loadMoreError={loadMoreError}
          loadingMore={loadingMore}
          onLoadMore={loadMore}
          onRetryInitial={refresh}
          onRetryLoadMore={retryLoadMore}
          onAppAction={handleAppAction}
        />
      </PageContent>
    </div>
  )
}
