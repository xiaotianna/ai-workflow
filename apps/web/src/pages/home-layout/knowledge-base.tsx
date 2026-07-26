import { useState } from 'react'

import { PageContent } from '@/components/page-content'
import { PageHeaderActions } from '@/components/page-header-actions'
import { PageTitle } from '@/components/page-title'
import {
  CreateKnowledgeBaseDialog,
  initialKnowledgeBases,
  KnowledgeBaseGrid,
  KnowledgeBaseToolbar,
  type CreateKnowledgeBaseInput,
  type KnowledgeBaseActionHandler,
} from '@/features/knowledge-base'

const editedAtFormatter = new Intl.DateTimeFormat('zh-CN', {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
})

export interface KnowledgeBasePageProps {
  onKnowledgeBaseAction?: KnowledgeBaseActionHandler
}

export default function KnowledgeBasePage({ onKnowledgeBaseAction }: KnowledgeBasePageProps) {
  const [knowledgeBases, setKnowledgeBases] = useState(initialKnowledgeBases)
  const [search, setSearch] = useState('')
  const [createDialogOpen, setCreateDialogOpen] = useState(false)

  const normalizedQuery = search.trim().toLowerCase()
  const visibleKnowledgeBases = knowledgeBases.filter((knowledgeBase) => {
    if (!normalizedQuery) return true
    return (
      knowledgeBase.title.toLowerCase().includes(normalizedQuery) ||
      knowledgeBase.kindLabel.toLowerCase().includes(normalizedQuery)
    )
  })

  function handleCreateKnowledgeBase(input: CreateKnowledgeBaseInput) {
    setKnowledgeBases((currentKnowledgeBases) => [
      {
        id: `local-${Date.now()}`,
        title: input.title,
        kind: 'workflow',
        kindLabel: '通用',
        author: '0 文档',
        editedAtLabel: editedAtFormatter.format(new Date()),
        description: input.description,
        icon: input.icon,
      },
      ...currentKnowledgeBases,
    ])
  }

  return (
    <div className="flex min-h-full flex-col">
      <PageTitle title="知识库" />

      <PageHeaderActions>
        <KnowledgeBaseToolbar
          search={search}
          onSearchChange={setSearch}
          onCreateKnowledgeBase={() => setCreateDialogOpen(true)}
        />
      </PageHeaderActions>

      <CreateKnowledgeBaseDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onCreate={handleCreateKnowledgeBase}
      />

      <PageContent>
        <KnowledgeBaseGrid
          knowledgeBases={visibleKnowledgeBases}
          onKnowledgeBaseAction={onKnowledgeBaseAction}
        />
      </PageContent>
    </div>
  )
}
