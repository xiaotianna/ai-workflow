import { useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import type { RowSelectionState, SortingState } from '@tanstack/react-table'

import { PageContent } from '@/components/page-content'
import { PageHeaderActions } from '@/components/page-header-actions'
import { PageTitle } from '@/components/page-title'
import {
  AddDocumentDialog,
  DocumentTable,
  DocumentToolbar,
  initialDocuments,
  type AddDocumentInput,
  type DocumentActionHandler,
} from '@/features/knowledge-base'
import { documentPageSizeOptions } from '@/features/knowledge-base/constants'

const uploadedAtFormatter = new Intl.DateTimeFormat('zh-CN', {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
})

const sortFieldMap = {
  'uploaded-at': 'uploadedAt',
  'recall-count': 'recallCount',
  'character-count': 'characterCount',
  name: 'name',
} as const

export interface KnowledgeBaseDocumentsPageProps {
  onDocumentAction?: DocumentActionHandler
}

export default function KnowledgeBaseDocumentsPage({
  onDocumentAction,
}: KnowledgeBaseDocumentsPageProps) {
  const { id: knowledgeBaseId = '' } = useParams<{ id: string }>()
  const [documents, setDocuments] = useState(() =>
    initialDocuments.filter((document) => document.knowledgeBaseId === knowledgeBaseId),
  )
  const [category, setCategory] = useState('all')
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState('uploaded-at')
  const [sortDescending, setSortDescending] = useState(true)
  const [pageIndex, setPageIndex] = useState(0)
  const [pageSize, setPageSize] = useState<number>(documentPageSizeOptions[0])
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({})
  const [addDialogOpen, setAddDialogOpen] = useState(false)

  const sorting = useMemo<SortingState>(
    () => [
      {
        id: sortFieldMap[sortBy as keyof typeof sortFieldMap] ?? 'uploadedAt',
        desc: sortDescending,
      },
    ],
    [sortBy, sortDescending],
  )

  const visibleDocuments = useMemo(() => {
    const normalizedQuery = search.trim().toLowerCase()

    return documents.filter((document) => {
      if (category !== 'all' && document.fileType !== category) {
        return false
      }

      if (!normalizedQuery) {
        return true
      }

      return document.name.toLowerCase().includes(normalizedQuery)
    })
  }, [category, documents, search])

  function handleSortingChange(updater: SortingState | ((old: SortingState) => SortingState)) {
    const nextSorting = typeof updater === 'function' ? updater(sorting) : updater
    const activeSort = nextSorting[0]

    if (!activeSort) return

    const nextSortBy =
      (Object.entries(sortFieldMap).find(([, columnId]) => columnId === activeSort.id)?.[0] as
        | keyof typeof sortFieldMap
        | undefined) ?? 'uploaded-at'

    setSortBy(nextSortBy)
    setSortDescending(activeSort.desc ?? true)
    setPageIndex(0)
  }

  function handleDocumentEnabledChange(documentId: string, enabled: boolean) {
    setDocuments((currentDocuments) =>
      currentDocuments.map((document) =>
        document.id === documentId
          ? {
              ...document,
              enabled,
              status: enabled ? 'available' : 'disabled',
              statusLabel: enabled ? '可用' : '已禁用',
            }
          : document,
      ),
    )
  }

  function handleAddDocument(input: AddDocumentInput) {
    const uploadedAt = new Date()
    const extension = input.file.name.split('.').pop()?.toLowerCase() ?? 'other'
    const fileType =
      extension === 'md' || extension === 'markdown'
        ? 'markdown'
        : extension === 'pdf'
          ? 'pdf'
          : extension === 'txt'
            ? 'text'
            : 'other'

    setDocuments((currentDocuments) => [
      {
        id: `local-${Date.now()}`,
        knowledgeBaseId,
        name: input.file.name,
        fileType,
        segmentationMode: 'general',
        segmentationModeLabel: '通用',
        characterCount: Math.max(Math.round(input.file.size / 2), 1),
        recallCount: 0,
        uploadedAt: uploadedAt.toISOString(),
        uploadedAtLabel: uploadedAtFormatter.format(uploadedAt),
        status: 'indexing',
        statusLabel: '索引中',
        enabled: true,
      },
      ...currentDocuments,
    ])
    setPageIndex(0)
  }

  return (
    <div className="flex min-h-full flex-col px-6 pt-4 pb-2">
      <PageTitle title="文档" subtitle="管理知识库中的文档与分段内容" />

      <PageHeaderActions>
        <DocumentToolbar
          category={category}
          search={search}
          sortBy={sortBy}
          onAddDocument={() => setAddDialogOpen(true)}
          onCategoryChange={(nextCategory) => {
            setCategory(nextCategory)
            setPageIndex(0)
          }}
          onMetadataClick={() => undefined}
          onSearchChange={(nextSearch) => {
            setSearch(nextSearch)
            setPageIndex(0)
          }}
          onSortByChange={(nextSortBy) => {
            setSortBy(nextSortBy)
            setPageIndex(0)
          }}
        />
      </PageHeaderActions>

      <AddDocumentDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        onAdd={handleAddDocument}
      />

      <PageContent className="mt-4 flex min-h-0 flex-1 flex-col">
        <DocumentTable
          documents={visibleDocuments}
          pageIndex={pageIndex}
          pageSize={pageSize}
          rowSelection={rowSelection}
          sorting={sorting}
          onDocumentAction={onDocumentAction}
          onDocumentEnabledChange={handleDocumentEnabledChange}
          onPageChange={setPageIndex}
          onPageSizeChange={(nextPageSize) => {
            setPageSize(nextPageSize)
            setPageIndex(0)
          }}
          onRowSelectionChange={setRowSelection}
          onSortingChange={handleSortingChange}
        />
      </PageContent>
    </div>
  )
}
