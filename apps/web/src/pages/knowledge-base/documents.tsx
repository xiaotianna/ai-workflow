import {
  createKnowledgeDocuments,
  deleteKnowledgeDocument,
  getKnowledgeDocument,
  getKnowledgeBaseSettings,
  listKnowledgeDocuments,
  previewKnowledgeDocuments,
  reindexKnowledgeDocument,
  updateKnowledgeDocument,
  type KnowledgeBaseSettingsDto,
} from '@/api/knowledge-bases'
import { showToast } from '@ai-workflow/ui/lib/toast'
import type { RowSelectionState } from '@tanstack/react-table'
import { AnimatePresence, motion, MotionConfig } from 'motion/react'
import { useEffect, useState } from 'react'
import { useOutletContext, useParams } from 'react-router-dom'

import { PageContent } from '@/components/page-content'
import { PageHeaderActions } from '@/components/page-header-actions'
import { PageTitle } from '@/components/page-title'
import {
  AddDocumentPage,
  DeleteDocumentDialog,
  documentPageSizeOptions,
  DocumentTable,
  DocumentToolbar,
  RenameDocumentDialog,
  toKnowledgeBaseDocument,
  type AddDocumentInput,
  type DocumentAction,
  type KnowledgeBaseDocument,
  type KnowledgeDocumentFileTypeFilter,
  type KnowledgeDocumentSort,
} from '@/features/knowledge-base'

import type { KnowledgeBaseDetailOutletContext } from '.'

const segmentationModeToApi = {
  general: 'GENERAL',
  qa: 'QA',
  'parent-child': 'PARENT_CHILD',
} as const

const segmentationModeFromApi = {
  GENERAL: 'general',
  QA: 'qa',
  PARENT_CHILD: 'parent-child',
} as const

export default function KnowledgeBaseDocumentsPage() {
  const { id: knowledgeBaseId = '' } = useParams<{ id: string }>()
  const { isResourceAvailable, knowledgeBase } =
    useOutletContext<KnowledgeBaseDetailOutletContext>()
  const [documents, setDocuments] = useState<KnowledgeBaseDocument[]>([])
  const [settings, setSettings] = useState<KnowledgeBaseSettingsDto>()
  const [search, setSearch] = useState('')
  const [fileType, setFileType] = useState<KnowledgeDocumentFileTypeFilter>('all')
  const [sort, setSort] = useState<KnowledgeDocumentSort>('uploaded_desc')
  const [pageIndex, setPageIndex] = useState(0)
  const [pageSize, setPageSize] = useState<number>(documentPageSizeOptions[0])
  const [total, setTotal] = useState(0)
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({})
  const [addPageOpen, setAddPageOpen] = useState(false)
  const [deletingDocument, setDeletingDocument] = useState<KnowledgeBaseDocument>()
  const [renamingDocument, setRenamingDocument] = useState<KnowledgeBaseDocument>()
  const [loading, setLoading] = useState(false)
  const [reloadVersion, setReloadVersion] = useState(0)

  useEffect(() => {
    if (!isResourceAvailable || !knowledgeBaseId) return
    const controller = new AbortController()
    void getKnowledgeBaseSettings(knowledgeBaseId, controller.signal)
      .then(setSettings)
      .catch(() => undefined)
    return () => controller.abort()
  }, [isResourceAvailable, knowledgeBaseId, reloadVersion])

  useEffect(() => {
    if (!isResourceAvailable || !knowledgeBaseId) return
    const controller = new AbortController()
    const timer = globalThis.setTimeout(() => {
      setLoading(true)
      void listKnowledgeDocuments(
        knowledgeBaseId,
        {
          search: search.trim() || undefined,
          fileType: fileType === 'all' ? undefined : fileType,
          sort,
          page: pageIndex + 1,
          pageSize,
        },
        controller.signal,
      )
        .then((result) => {
          setDocuments(result.items.map(toKnowledgeBaseDocument))
          setTotal(result.total)
          setRowSelection({})
        })
        .catch(() => undefined)
        .finally(() => {
          if (!controller.signal.aborted) setLoading(false)
        })
    }, 300)

    return () => {
      globalThis.clearTimeout(timer)
      controller.abort()
    }
  }, [
    fileType,
    isResourceAvailable,
    knowledgeBaseId,
    pageIndex,
    pageSize,
    reloadVersion,
    search,
    sort,
  ])

  async function handleAddDocument(input: AddDocumentInput) {
    const createdDocuments = await createKnowledgeDocuments(knowledgeBaseId, {
      files: input.files,
      segmentationMode: segmentationModeToApi[input.segmentationMode],
      maxSegmentLength: input.maxSegmentLength,
      overlapLength: input.overlapLength,
      normalizeWhitespace: input.replaceWhitespace,
    })
    setPageIndex(0)
    setReloadVersion((value) => value + 1)
    showToast('success', '文档已上传，正在处理')
    return createdDocuments
  }

  async function handleDocumentEnabledChange(documentId: string, enabled: boolean) {
    const current = documents
    setDocuments((items) =>
      items.map((item) =>
        item.id === documentId
          ? {
              ...item,
              enabled,
              status: enabled ? (item.needsReindex ? 'stale' : 'available') : 'disabled',
              statusLabel: enabled ? (item.needsReindex ? '待更新' : '可用') : '已禁用',
            }
          : item,
      ),
    )
    try {
      await updateKnowledgeDocument(knowledgeBaseId, documentId, { enabled })
    } catch {
      setDocuments(current)
    }
  }

  async function handleDocumentAction(action: DocumentAction, document: KnowledgeBaseDocument) {
    if (action === 'rename') {
      setRenamingDocument(document)
      return
    }

    if (action === 'reindex') {
      await reindexKnowledgeDocument(knowledgeBaseId, document.id)
      setReloadVersion((value) => value + 1)
      showToast('success', '文档分段已按当前设置更新')
      return
    }

    if (action === 'delete') {
      setDeletingDocument(document)
    }
  }

  if (!isResourceAvailable) {
    return (
      <div className="flex h-full min-h-0 flex-col overflow-hidden px-6 pt-4 pb-2">
        <PageTitle title="文档" subtitle="管理知识库中的文档与分段内容" />
        <PageContent className="text-muted-foreground mt-4 flex min-h-0 flex-1 items-center justify-center text-sm">
          知识库不可用或正在加载
        </PageContent>
      </div>
    )
  }

  return (
    <div className="relative h-full min-h-0 overflow-hidden">
      {deletingDocument ? (
        <DeleteDocumentDialog
          document={deletingDocument}
          open
          onOpenChange={(open) => {
            if (!open) setDeletingDocument(undefined)
          }}
          onDelete={async () => {
            await deleteKnowledgeDocument(knowledgeBaseId, deletingDocument.id)
            setReloadVersion((value) => value + 1)
            showToast('success', '文档已删除')
          }}
        />
      ) : null}
      {renamingDocument ? (
        <RenameDocumentDialog
          document={renamingDocument}
          open
          onOpenChange={(open) => {
            if (!open) setRenamingDocument(undefined)
          }}
          onRename={async (name) => {
            await updateKnowledgeDocument(knowledgeBaseId, renamingDocument.id, { name })
            setReloadVersion((value) => value + 1)
            showToast('success', '文档已重命名')
          }}
        />
      ) : null}
      <MotionConfig reducedMotion="user" transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}>
        <AnimatePresence initial={false} mode="popLayout">
          {addPageOpen ? (
            <motion.div
              key="add-document-page"
              initial={{ opacity: 0, x: '100%' }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: '100%' }}
              className="fixed inset-0 z-50"
            >
              <AddDocumentPage
                embeddingEnabled={Boolean(settings?.embeddingConfiguredModelId)}
                knowledgeBaseName={knowledgeBase?.title}
                initialSettings={
                  settings
                    ? {
                        segmentationMode: segmentationModeFromApi[settings.segmentationMode],
                        maxSegmentLength: settings.maxSegmentLength,
                        overlapLength: settings.overlapLength,
                        replaceWhitespace: settings.normalizeWhitespace,
                      }
                    : undefined
                }
                onAdd={handleAddDocument}
                onPreview={(input) =>
                  previewKnowledgeDocuments(knowledgeBaseId, {
                    files: input.files,
                    segmentationMode: segmentationModeToApi[input.segmentationMode],
                    maxSegmentLength: input.maxSegmentLength,
                    overlapLength: input.overlapLength,
                    normalizeWhitespace: input.replaceWhitespace,
                  })
                }
                onRefreshDocument={(documentId, signal) =>
                  getKnowledgeDocument(knowledgeBaseId, documentId, signal)
                }
                onClose={() => {
                  setAddPageOpen(false)
                  setReloadVersion((value) => value + 1)
                }}
              />
            </motion.div>
          ) : (
            <motion.div
              key="document-list-page"
              initial={{ opacity: 0, x: '-100%' }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: '-100%' }}
              className="absolute inset-0 flex min-h-0 flex-col overflow-hidden px-6 pt-4 pb-2"
            >
              <PageTitle title="文档" subtitle="管理知识库中的文档与分段内容" />
              <PageHeaderActions>
                <DocumentToolbar
                  search={search}
                  fileType={fileType}
                  sort={sort}
                  disabled={loading}
                  onAddDocument={() => setAddPageOpen(true)}
                  onFileTypeChange={(value) => {
                    setFileType(value)
                    setPageIndex(0)
                  }}
                  onSearchChange={(value) => {
                    setSearch(value)
                    setPageIndex(0)
                  }}
                  onSortChange={(value) => {
                    setSort(value)
                    setPageIndex(0)
                  }}
                />
              </PageHeaderActions>
              <PageContent className="mt-4 flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
                <DocumentTable
                  documents={documents}
                  total={total}
                  pageIndex={pageIndex}
                  pageSize={pageSize}
                  rowSelection={rowSelection}
                  onDocumentAction={(action, document) =>
                    void handleDocumentAction(action, document)
                  }
                  onDocumentEnabledChange={(documentId, enabled) =>
                    void handleDocumentEnabledChange(documentId, enabled)
                  }
                  onPageChange={setPageIndex}
                  onPageSizeChange={(value) => {
                    setPageSize(value)
                    setPageIndex(0)
                  }}
                  onRowSelectionChange={setRowSelection}
                />
              </PageContent>
            </motion.div>
          )}
        </AnimatePresence>
      </MotionConfig>
    </div>
  )
}
