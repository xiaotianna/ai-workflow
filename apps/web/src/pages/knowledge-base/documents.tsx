import type { RowSelectionState, SortingState } from '@tanstack/react-table'
import { AnimatePresence, motion, MotionConfig } from 'motion/react'
import { useEffect, useMemo, useState } from 'react'
import { useOutletContext, useParams } from 'react-router-dom'

import { PageContent } from '@/components/page-content'
import { PageHeaderActions } from '@/components/page-header-actions'
import { PageTitle } from '@/components/page-title'
import {
  AddDocumentPage,
  createMockDocuments,
  DocumentTable,
  DocumentToolbar,
  type AddDocumentInput,
  type DocumentAction,
  type DocumentActionHandler,
  type KnowledgeBaseDocument,
} from '@/features/knowledge-base'
import { documentPageSizeOptions } from '@/features/knowledge-base/constants'

import type { KnowledgeBaseDetailOutletContext } from '.'

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
  const { isResourceAvailable, knowledgeBase } =
    useOutletContext<KnowledgeBaseDetailOutletContext>()
  const [documents, setDocuments] = useState(() => createMockDocuments(knowledgeBaseId))
  const [category, setCategory] = useState('all')
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState('uploaded-at')
  const [sortDescending, setSortDescending] = useState(true)
  const [pageIndex, setPageIndex] = useState(0)
  const [pageSize, setPageSize] = useState<number>(documentPageSizeOptions[0])
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({})
  const [addPageOpen, setAddPageOpen] = useState(false)
  const [slideDirection, setSlideDirection] = useState(1)

  useEffect(() => {
    setDocuments(createMockDocuments(knowledgeBaseId))
    setPageIndex(0)
    setRowSelection({})
  }, [knowledgeBaseId])

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

  function handleDocumentAction(action: DocumentAction, document: KnowledgeBaseDocument) {
    if (action === 'delete') {
      setDocuments((currentDocuments) => currentDocuments.filter((item) => item.id !== document.id))
      setRowSelection((currentSelection) => {
        const nextSelection = { ...currentSelection }
        delete nextSelection[document.id]
        return nextSelection
      })
      return
    }

    if (action === 'rename' || action === 'reindex') {
      return
    }
  }

  function handleAddDocument(input: AddDocumentInput) {
    const uploadedAt = new Date()
    const uploadedDocuments = input.files.map((file, index) => {
      const extension = file.name.split('.').pop()?.toLowerCase() ?? 'other'
      const fileType =
        extension === 'md' || extension === 'mdx' || extension === 'markdown'
          ? 'markdown'
          : extension === 'pdf'
            ? 'pdf'
            : extension === 'txt'
              ? 'text'
              : 'other'

      return {
        id: `local-${uploadedAt.getTime()}-${index}`,
        knowledgeBaseId,
        name: file.name,
        fileType,
        segmentationMode: 'general' as const,
        segmentationModeLabel: '通用',
        characterCount: Math.max(Math.round(file.size / 2), 1),
        recallCount: 0,
        uploadedAt: uploadedAt.toISOString(),
        uploadedAtLabel: uploadedAtFormatter.format(uploadedAt),
        status: 'indexing' as const,
        statusLabel: '索引中',
        enabled: true,
      }
    })

    setDocuments((currentDocuments) => [...uploadedDocuments, ...currentDocuments])
    setPageIndex(0)
  }

  function openAddPage() {
    setSlideDirection(1)
    setAddPageOpen(true)
  }

  function closeAddPage() {
    setSlideDirection(-1)
    setAddPageOpen(false)
  }

  if (!isResourceAvailable) {
    return (
      <div className="flex h-full min-h-0 flex-col overflow-hidden px-6 pt-4 pb-2">
        <PageTitle title="文档" subtitle="管理知识库中的文档与分段内容" />

        <PageContent className="mt-4 flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          <div className="text-muted-foreground flex min-h-48 items-center justify-center text-sm">
            知识库不可用或正在加载
          </div>
        </PageContent>
      </div>
    )
  }

  return (
    <div className="relative h-full min-h-0 overflow-hidden">
      <MotionConfig reducedMotion="user" transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}>
        <AnimatePresence initial={false} mode="popLayout" custom={slideDirection}>
          {addPageOpen ? (
            <motion.div
              key="add-document-page"
              custom={slideDirection}
              initial={{ opacity: 0, x: '100%' }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: '100%' }}
              className="fixed inset-0 z-50"
            >
              <AddDocumentPage
                knowledgeBaseName={knowledgeBase?.title}
                onAdd={handleAddDocument}
                onClose={closeAddPage}
              />
            </motion.div>
          ) : (
            <motion.div
              key="document-list-page"
              custom={slideDirection}
              initial={{ opacity: 0, x: '-100%' }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: '-100%' }}
              className="absolute inset-0 flex min-h-0 flex-col overflow-hidden px-6 pt-4 pb-2"
            >
              <PageTitle title="文档" subtitle="管理知识库中的文档与分段内容" />

              <PageHeaderActions>
                <DocumentToolbar
                  category={category}
                  search={search}
                  sortBy={sortBy}
                  onAddDocument={openAddPage}
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

              <PageContent className="mt-4 flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
                <DocumentTable
                  documents={visibleDocuments}
                  pageIndex={pageIndex}
                  pageSize={pageSize}
                  rowSelection={rowSelection}
                  sorting={sorting}
                  onDocumentAction={onDocumentAction ?? handleDocumentAction}
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
            </motion.div>
          )}
        </AnimatePresence>
      </MotionConfig>
    </div>
  )
}
