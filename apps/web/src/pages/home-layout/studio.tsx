import {
  createStudioApp,
  deleteStudioApp,
  duplicateStudioApp,
  importStudioApp,
  updateStudioApp,
} from '@/api/studio'
import { showToast } from '@ai-workflow/ui/lib/toast'
import { useState } from 'react'

import { PageContent } from '@/components/page-content'
import { PageHeaderActions } from '@/components/page-header-actions'
import { PageTitle } from '@/components/page-title'
import {
  CreateBlankAppDialog,
  DeleteStudioAppDialog,
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
    } = useStudioApps(),
    [createDialogOpen, setCreateDialogOpen] = useState(false),
    [importDialogOpen, setImportDialogOpen] = useState(false),
    [editingApp, setEditingApp] = useState<StudioAppListItem>(),
    [deletingApp, setDeletingApp] = useState<StudioAppListItem>()

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

  async function handleImportApp(dsl: unknown) {
    await importStudioApp(dsl)
    refresh()
    showToast('success', 'DSL 已导入')
  }

  async function handleDeleteApp() {
    if (!deletingApp) return

    await deleteStudioApp(deletingApp.id)
    refresh()
    showToast('success', '工作流已删除')
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

    if (action === 'duplicate') {
      void duplicateStudioApp(app.id)
        .then((duplicatedApp) => {
          refresh()
          showToast('success', `已创建 ${duplicatedApp.title}`)
        })
        .catch(() => undefined)
      return
    }

    if (action === 'delete') {
      setDeletingApp(app)
      return
    }

    onAppAction?.(action, app)
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
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

      {deletingApp ? (
        <DeleteStudioAppDialog
          app={deletingApp}
          open
          onOpenChange={(open) => {
            if (!open) setDeletingApp(undefined)
          }}
          onDelete={handleDeleteApp}
        />
      ) : undefined}

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

      <PageContent>
        <StudioAppGrid
          apps={apps}
          hasMore={hasMore}
          initialError={initialError}
          initialLoading={initialLoading}
          loadMoreError={loadMoreError}
          loadingMore={loadingMore}
          sort={sort}
          onLoadMore={loadMore}
          onRetryInitial={refresh}
          onRetryLoadMore={retryLoadMore}
          onAppAction={handleAppAction}
        />
      </PageContent>
    </div>
  )
}
