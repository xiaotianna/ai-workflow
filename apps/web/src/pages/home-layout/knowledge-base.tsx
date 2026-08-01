import {
  createKnowledgeBase,
  deleteKnowledgeBase,
  updateKnowledgeBase,
} from '@/api/knowledge-bases'
import { showToast } from '@ai-workflow/ui/lib/toast'
import { useState } from 'react'

import { PageContent } from '@/components/page-content'
import { PageHeaderActions } from '@/components/page-header-actions'
import { PageTitle } from '@/components/page-title'
import {
  CreateKnowledgeBaseDialog,
  DeleteKnowledgeBaseDialog,
  EditKnowledgeBaseDialog,
  KnowledgeBaseGrid,
  KnowledgeBaseToolbar,
  type CreateKnowledgeBaseInput,
  type KnowledgeBaseActionHandler,
  type KnowledgeBaseListItem,
  useKnowledgeBases,
} from '@/features/knowledge-base'

export default function KnowledgeBasePage() {
  const { error, knowledgeBases, loading, refresh, search, setSearch, setSort, sort } =
    useKnowledgeBases()
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [editingKnowledgeBase, setEditingKnowledgeBase] = useState<KnowledgeBaseListItem>()
  const [deletingKnowledgeBase, setDeletingKnowledgeBase] = useState<KnowledgeBaseListItem>()

  async function handleCreateKnowledgeBase(input: CreateKnowledgeBaseInput) {
    await createKnowledgeBase(input)
    refresh()
    showToast('success', '知识库已创建')
  }

  async function handleUpdateKnowledgeBase(input: CreateKnowledgeBaseInput) {
    if (!editingKnowledgeBase) return

    await updateKnowledgeBase(editingKnowledgeBase.id, {
      ...input,
      description: input.description ?? '',
    })
    refresh()
    showToast('success', '知识库信息已保存')
  }

  async function handleDeleteKnowledgeBase() {
    if (!deletingKnowledgeBase) return

    await deleteKnowledgeBase(deletingKnowledgeBase.id)
    refresh()
    showToast('success', '知识库已删除')
  }

  function handleKnowledgeBaseAction(
    action: Parameters<KnowledgeBaseActionHandler>[0],
    knowledgeBase: KnowledgeBaseListItem,
  ) {
    if (action === 'edit') {
      setEditingKnowledgeBase(knowledgeBase)
      return
    }

    setDeletingKnowledgeBase(knowledgeBase)
  }

  return (
    <div className="flex min-h-full flex-col">
      <PageTitle title="知识库" />

      <PageHeaderActions>
        <KnowledgeBaseToolbar
          search={search}
          sort={sort}
          onSearchChange={setSearch}
          onSortChange={setSort}
          onCreateKnowledgeBase={() => setCreateDialogOpen(true)}
        />
      </PageHeaderActions>

      <CreateKnowledgeBaseDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onCreate={handleCreateKnowledgeBase}
      />

      {editingKnowledgeBase ? (
        <EditKnowledgeBaseDialog
          knowledgeBase={editingKnowledgeBase}
          open
          onOpenChange={(open) => {
            if (!open) setEditingKnowledgeBase(undefined)
          }}
          onUpdate={handleUpdateKnowledgeBase}
        />
      ) : undefined}

      {deletingKnowledgeBase ? (
        <DeleteKnowledgeBaseDialog
          knowledgeBase={deletingKnowledgeBase}
          open
          onOpenChange={(open) => {
            if (!open) setDeletingKnowledgeBase(undefined)
          }}
          onDelete={handleDeleteKnowledgeBase}
        />
      ) : undefined}

      <PageContent>
        <KnowledgeBaseGrid
          knowledgeBases={knowledgeBases}
          error={error}
          loading={loading}
          sort={sort}
          onRetry={refresh}
          onKnowledgeBaseAction={handleKnowledgeBaseAction}
        />
      </PageContent>
    </div>
  )
}
