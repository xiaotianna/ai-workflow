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
import { useEffect, useRef, useState } from 'react'
import { useNavigate, useOutletContext, useParams } from 'react-router-dom'

import { PageContent } from '@/components/page-content'
import { PageHeaderActions } from '@/components/page-header-actions'
import { PageTitle } from '@/components/page-title'
import {
  AddDocumentPage,
  DeleteDocumentDialog,
  documentPageSizeOptions,
  documentStatusPollIntervalMs,
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
  } as const,
  segmentationModeFromApi = {
    GENERAL: 'general',
    QA: 'qa',
    PARENT_CHILD: 'parent-child',
  } as const

export default function KnowledgeBaseDocumentsPage() {
  const navigate = useNavigate(),
    { id: knowledgeBaseId = '' } = useParams<{ id: string }>(),
    { isResourceAvailable, knowledgeBase } = useOutletContext<KnowledgeBaseDetailOutletContext>(),
    [documents, setDocuments] = useState<KnowledgeBaseDocument[]>([]),
    [settings, setSettings] = useState<KnowledgeBaseSettingsDto>(),
    [search, setSearch] = useState(''),
    [fileType, setFileType] = useState<KnowledgeDocumentFileTypeFilter>('all'),
    [sort, setSort] = useState<KnowledgeDocumentSort>('uploaded_desc'),
    [pageIndex, setPageIndex] = useState(0),
    [pageSize, setPageSize] = useState<number>(documentPageSizeOptions[0]),
    [total, setTotal] = useState(0),
    [rowSelection, setRowSelection] = useState<RowSelectionState>({}),
    [addPageOpen, setAddPageOpen] = useState(false),
    [deletingDocuments, setDeletingDocuments] = useState<KnowledgeBaseDocument[]>([]),
    [renamingDocument, setRenamingDocument] = useState<KnowledgeBaseDocument>(),
    [batchUpdatingDocuments, setBatchUpdatingDocuments] = useState(false),
    [loading, setLoading] = useState(true),
    [reloadVersion, setReloadVersion] = useState(0),
    [documentStatusRefreshFailed, setDocumentStatusRefreshFailed] = useState(false),
    reindexingDocumentIds = useRef(new Set<string>())

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
    const controller = new AbortController(),
      timer = globalThis.setTimeout(() => {
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
            setDocumentStatusRefreshFailed(false)
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

  useEffect(() => {
    if (
      !isResourceAvailable ||
      !knowledgeBaseId ||
      documentStatusRefreshFailed ||
      !documents.some(
        (document) =>
          document.status === 'indexing' && !reindexingDocumentIds.current.has(document.id),
      )
    ) {
      return
    }

    const controller = new AbortController(),
      timer = globalThis.setTimeout(() => {
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
            if (controller.signal.aborted) return
            setDocuments((currentDocuments) => {
              const currentDocumentsById = new Map(
                currentDocuments.map((document) => [document.id, document]),
              )
              return result.items.map((item) => {
                if (reindexingDocumentIds.current.has(item.id)) {
                  return currentDocumentsById.get(item.id) ?? toKnowledgeBaseDocument(item)
                }
                return toKnowledgeBaseDocument(item)
              })
            })
            setTotal(result.total)
          })
          .catch(() => {
            if (!controller.signal.aborted) setDocumentStatusRefreshFailed(true)
          })
      }, documentStatusPollIntervalMs)

    return () => {
      globalThis.clearTimeout(timer)
      controller.abort()
    }
  }, [
    documentStatusRefreshFailed,
    documents,
    fileType,
    isResourceAvailable,
    knowledgeBaseId,
    pageIndex,
    pageSize,
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
    showToast('success', '文档已提交，正在构建索引')
    return createdDocuments
  }

  function handlePageChange(value: number) {
    setLoading(true)
    setRowSelection({})
    setPageIndex(value)
  }

  function handlePageSizeChange(value: number) {
    setLoading(true)
    setRowSelection({})
    setPageSize(value)
    setPageIndex(0)
  }

  async function handleDocumentEnabledChange(documentId: string, enabled: boolean) {
    if (batchUpdatingDocuments) return
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

  async function handleSelectedDocumentsEnabledChange(enabled: boolean) {
    if (batchUpdatingDocuments) return
    const selectedDocuments = documents.filter((document) => rowSelection[document.id])
    if (selectedDocuments.length === 0) return

    setBatchUpdatingDocuments(true)
    try {
      const results = await Promise.allSettled(
          selectedDocuments.map((document) =>
            updateKnowledgeDocument(knowledgeBaseId, document.id, { enabled }),
          ),
        ),
        updatedDocuments = results.flatMap((result) =>
          result.status === 'fulfilled' ? [toKnowledgeBaseDocument(result.value)] : [],
        ),
        updatedDocumentsById = new Map(updatedDocuments.map((document) => [document.id, document]))

      setDocuments((currentDocuments) =>
        currentDocuments.map((document) => updatedDocumentsById.get(document.id) ?? document),
      )
      setRowSelection((currentSelection) => {
        const nextSelection = { ...currentSelection }
        updatedDocuments.forEach((document) => delete nextSelection[document.id])
        return nextSelection
      })

      if (updatedDocuments.length > 0) {
        showToast('success', `已${enabled ? '启用' : '禁用'} ${updatedDocuments.length} 个文档`)
      }
    } finally {
      setBatchUpdatingDocuments(false)
    }
  }

  async function handleSelectedDocumentsReindex() {
    if (batchUpdatingDocuments) return
    const selectedDocuments = documents.filter((document) => rowSelection[document.id])
    if (selectedDocuments.length === 0) return

    const selectedDocumentsById = new Map(
      selectedDocuments.map((document) => [document.id, document]),
    )
    selectedDocuments.forEach((document) => reindexingDocumentIds.current.add(document.id))
    setBatchUpdatingDocuments(true)
    setDocumentStatusRefreshFailed(false)
    setDocuments((currentDocuments) =>
      currentDocuments.map((document) =>
        selectedDocumentsById.has(document.id)
          ? { ...document, status: 'indexing', statusLabel: '索引构建中' }
          : document,
      ),
    )

    try {
      const results = await Promise.allSettled(
          selectedDocuments.map((document) =>
            reindexKnowledgeDocument(knowledgeBaseId, document.id),
          ),
        ),
        reindexedDocuments = results.flatMap((result) =>
          result.status === 'fulfilled' ? [toKnowledgeBaseDocument(result.value)] : [],
        ),
        reindexedDocumentsById = new Map(
          reindexedDocuments.map((document) => [document.id, document]),
        )

      setDocuments((currentDocuments) =>
        currentDocuments.map(
          (document) =>
            reindexedDocumentsById.get(document.id) ??
            selectedDocumentsById.get(document.id) ??
            document,
        ),
      )
      setRowSelection((currentSelection) => {
        const nextSelection = { ...currentSelection }
        reindexedDocuments.forEach((document) => delete nextSelection[document.id])
        return nextSelection
      })

      if (reindexedDocuments.length > 0) {
        showToast('success', `已提交 ${reindexedDocuments.length} 个文档重新索引`)
      }
    } finally {
      selectedDocuments.forEach((document) => reindexingDocumentIds.current.delete(document.id))
      setBatchUpdatingDocuments(false)
    }
  }

  async function handleDeleteDocuments(targetDocuments: KnowledgeBaseDocument[]) {
    if (batchUpdatingDocuments || targetDocuments.length === 0) return

    setBatchUpdatingDocuments(true)
    try {
      const results = await Promise.allSettled(
          targetDocuments.map((document) => deleteKnowledgeDocument(knowledgeBaseId, document.id)),
        ),
        deletedIds = new Set(
          results.flatMap((result, index) => {
            const document = targetDocuments[index]
            return result.status === 'fulfilled' && document ? [document.id] : []
          }),
        ),
        failedDocuments = targetDocuments.filter((document) => !deletedIds.has(document.id))

      if (deletedIds.size > 0) {
        setDocuments((currentDocuments) =>
          currentDocuments.filter((document) => !deletedIds.has(document.id)),
        )
        setTotal((currentTotal) => Math.max(0, currentTotal - deletedIds.size))
        setRowSelection((currentSelection) => {
          const nextSelection = { ...currentSelection }
          deletedIds.forEach((documentId) => delete nextSelection[documentId])
          return nextSelection
        })
        showToast(
          'success',
          deletedIds.size === 1 ? '文档已删除' : `已删除 ${deletedIds.size} 个文档`,
        )
      }

      if (failedDocuments.length > 0) {
        setDeletingDocuments(failedDocuments)
        throw new Error('部分文档删除失败')
      }

      setReloadVersion((value) => value + 1)
    } finally {
      setBatchUpdatingDocuments(false)
    }
  }

  async function handleDocumentAction(action: DocumentAction, document: KnowledgeBaseDocument) {
    if (action === 'rename') {
      setRenamingDocument(document)
      return
    }

    if (action === 'reindex') {
      if (reindexingDocumentIds.current.has(document.id)) return

      reindexingDocumentIds.current.add(document.id)
      setDocumentStatusRefreshFailed(false)
      setDocuments((currentDocuments) =>
        currentDocuments.map((currentDocument) =>
          currentDocument.id === document.id
            ? { ...currentDocument, status: 'indexing', statusLabel: '索引构建中' }
            : currentDocument,
        ),
      )
      try {
        const updatedDocument = await reindexKnowledgeDocument(knowledgeBaseId, document.id)
        setDocuments((currentDocuments) =>
          currentDocuments.map((currentDocument) =>
            currentDocument.id === document.id
              ? toKnowledgeBaseDocument(updatedDocument)
              : currentDocument,
          ),
        )
        showToast('success', '已提交文档重新索引')
      } catch {
        setDocuments((currentDocuments) =>
          currentDocuments.map((currentDocument) =>
            currentDocument.id === document.id ? document : currentDocument,
          ),
        )
      } finally {
        reindexingDocumentIds.current.delete(document.id)
      }
      return
    }

    if (action === 'delete') {
      setDeletingDocuments([document])
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
      {deletingDocuments.length > 0 ? (
        <DeleteDocumentDialog
          documents={deletingDocuments}
          open
          onOpenChange={(open) => {
            if (!open) setDeletingDocuments([])
          }}
          onDelete={() => handleDeleteDocuments(deletingDocuments)}
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
                onConfigureEmbedding={() =>
                  navigate(`/knowledge-base/${encodeURIComponent(knowledgeBaseId)}/settings`)
                }
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
                  disabled={loading || batchUpdatingDocuments}
                  searchDisabled={batchUpdatingDocuments}
                  statusRefreshFailed={documentStatusRefreshFailed}
                  onAddDocument={() => setAddPageOpen(true)}
                  onFileTypeChange={(value) => {
                    if (batchUpdatingDocuments) return
                    setFileType(value)
                    setRowSelection({})
                    setPageIndex(0)
                  }}
                  onSearchChange={(value) => {
                    if (batchUpdatingDocuments) return
                    setSearch(value)
                    setRowSelection({})
                    setPageIndex(0)
                  }}
                  onSortChange={(value) => {
                    if (batchUpdatingDocuments) return
                    setSort(value)
                    setRowSelection({})
                    setPageIndex(0)
                  }}
                  onStatusRefreshRetry={() => setDocumentStatusRefreshFailed(false)}
                />
              </PageHeaderActions>
              <PageContent className="mt-4 flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
                <DocumentTable
                  documents={documents}
                  loading={loading}
                  total={total}
                  pageIndex={pageIndex}
                  pageSize={pageSize}
                  rowSelection={rowSelection}
                  selectionBusy={batchUpdatingDocuments}
                  onDocumentAction={(action, document) =>
                    void handleDocumentAction(action, document)
                  }
                  onDocumentEnabledChange={(documentId, enabled) =>
                    void handleDocumentEnabledChange(documentId, enabled)
                  }
                  onSelectedDocumentsDelete={() => {
                    const selectedDocuments = documents.filter(
                      (document) => rowSelection[document.id],
                    )
                    if (selectedDocuments.length > 0) setDeletingDocuments(selectedDocuments)
                  }}
                  onSelectedDocumentsEnabledChange={(enabled) =>
                    void handleSelectedDocumentsEnabledChange(enabled)
                  }
                  onSelectedDocumentsReindex={() => void handleSelectedDocumentsReindex()}
                  onPageChange={handlePageChange}
                  onPageSizeChange={handlePageSizeChange}
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
