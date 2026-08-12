import {
  createKnowledgeChunk,
  listKnowledgeChunks,
  reindexKnowledgeDocument,
  updateKnowledgeChunk,
  updateKnowledgeDocument,
  type KnowledgeChunkDto,
  type KnowledgeDocumentDto,
} from '@/api/knowledge-bases'
import { FloatingSidePanel } from '@/components/floating-side-panel'
import { Button } from '@ai-workflow/ui/components/button'
import { Checkbox } from '@ai-workflow/ui/components/checkbox'
import { Input } from '@ai-workflow/ui/components/input'
import { Pagination } from '@ai-workflow/ui/components/pagination'
import { Skeleton } from '@ai-workflow/ui/components/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@ai-workflow/ui/components/select'
import { Switch } from '@ai-workflow/ui/components/switch'
import { showToast } from '@ai-workflow/ui/lib/toast'
import { cn } from '@ai-workflow/ui/lib/utils'
import { ArrowLeft, Grip, PencilLine, Plus, RefreshCw, Search, Trash2 } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useOutletContext, useParams } from 'react-router-dom'

import {
  documentPageSizeOptions,
  KnowledgeChunkContent,
  KnowledgeChunkCreatePanel,
  KnowledgeChunkEditPanel,
  KnowledgeDocumentMetadataPanel,
  KnowledgeDocumentSwitcher,
  KnowledgeSelectionActions,
  knowledgeSegmentationModeLabels,
} from '@/features/knowledge-base'

import type { KnowledgeBaseDetailOutletContext } from '.'

const dateFormatter = new Intl.DateTimeFormat('zh-CN', {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
})

function formatBytes(value: string) {
  const bytes = Number(value)
  if (!Number.isFinite(bytes)) return '-'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

type ChunkStatusFilter = 'all' | 'disabled' | 'enabled'

const chunkStatusFilterLabels: Record<ChunkStatusFilter, string> = {
    all: '全部',
    disabled: '已禁用',
    enabled: '已启用',
  },
  chunkSkeletonWidths = ['w-2/3', 'w-4/5', 'w-3/5', 'w-3/4', 'w-1/2', 'w-5/6']

function ChunkListSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div role="status" aria-label="正在加载分段列表">
      <span className="sr-only">正在加载分段列表</span>
      {Array.from({ length: count }, (_, index) => (
        <div
          key={`chunk-skeleton-${index}`}
          aria-hidden
          className="grid grid-cols-[1rem_minmax(0,1fr)] items-start gap-4"
        >
          <Skeleton className="mt-3 size-4 rounded-sm" />
          <div className="min-w-0">
            <div className="px-3 pt-2.5 pb-2">
              <div className="flex h-5 items-center justify-between gap-4 pr-1">
                <Skeleton className="h-3.5 w-48 max-w-[55%] rounded-sm" />
                <Skeleton className="h-3.5 w-16 shrink-0 rounded-sm" />
              </div>
              <Skeleton
                className={cn(
                  'mt-3 h-4 max-w-full rounded-sm',
                  chunkSkeletonWidths[index % chunkSkeletonWidths.length],
                )}
              />
              <Skeleton className="mt-2 h-3.5 w-2/5 max-w-56 rounded-sm" />
              <Skeleton className="mt-3 h-3 w-24 rounded-sm" />
            </div>
            <div className="bg-border/60 mx-3 my-2 h-px" />
          </div>
        </div>
      ))}
    </div>
  )
}

function DocumentInformationSkeleton() {
  return (
    <div role="status" aria-label="正在加载文档信息">
      <span className="sr-only">正在加载文档信息</span>
      <dl aria-hidden className="mt-3 grid grid-cols-[8rem_minmax(0,1fr)] gap-x-2 gap-y-1">
        {Array.from({ length: 5 }, (_, index) => (
          <div key={`document-information-skeleton-${index}`} className="contents">
            <dt className="py-1">
              <Skeleton className="h-3 w-20 rounded-sm" />
            </dt>
            <dd className="py-1">
              <Skeleton className={cn('h-3 rounded-sm', index === 0 ? 'w-32' : 'w-24')} />
            </dd>
          </div>
        ))}
      </dl>

      <h2 className="mt-6 text-xs leading-5 font-semibold">技术参数</h2>
      <dl aria-hidden className="mt-3 grid grid-cols-[8rem_minmax(0,1fr)] gap-x-2 gap-y-1">
        {Array.from({ length: 5 }, (_, index) => (
          <div key={`document-parameter-skeleton-${index}`} className="contents">
            <dt className="py-1">
              <Skeleton className="h-3 w-16 rounded-sm" />
            </dt>
            <dd className="py-1">
              <Skeleton className={cn('h-3 rounded-sm', index === 0 ? 'w-28' : 'w-20')} />
            </dd>
          </div>
        ))}
      </dl>
    </div>
  )
}

function getChunkTags(metadata: Record<string, unknown>): string[] {
  const value = metadata.tags ?? metadata.keywords
  if (!Array.isArray(value)) return []
  return [
    ...new Set(
      value
        .filter((item): item is string => typeof item === 'string' && Boolean(item.trim()))
        .map((item) => item.trim()),
    ),
  ]
}

function ChunkItem({
  chunk,
  editing,
  editDisabled,
  pending,
  selected,
  selectionDisabled,
  updatingEnabled,
  onEdit,
  onEnabledChange,
  onSelectedChange,
}: {
  chunk: KnowledgeChunkDto
  editing: boolean
  editDisabled: boolean
  pending: boolean
  selected: boolean
  selectionDisabled: boolean
  updatingEnabled: boolean
  onEdit: () => void
  onEnabledChange: (enabled: boolean) => void
  onSelectedChange: (selected: boolean) => void
}) {
  const tags = getChunkTags(chunk.metadata)

  return (
    <div className="grid grid-cols-[1rem_minmax(0,1fr)] items-start gap-4">
      <Checkbox
        checked={selected}
        disabled={selectionDisabled}
        aria-label={`选择分段-${String(chunk.sequence).padStart(2, '0')}`}
        className="mt-3"
        onCheckedChange={(checked) => onSelectedChange(Boolean(checked))}
      />

      <div className="min-w-0">
        <article
          aria-disabled={pending || undefined}
          data-edit-disabled={editDisabled || undefined}
          data-pending={pending || undefined}
          data-selected={selected || undefined}
          className="group/card data-[selected=true]:bg-muted/60 hover:bg-muted/60 focus-within:bg-muted/60 relative cursor-pointer rounded-xl px-3 pt-2.5 pb-2 transition-[background-color,opacity] data-[edit-disabled=true]:cursor-not-allowed data-[pending=true]:opacity-50"
          onClick={() => {
            if (!editDisabled) onEdit()
          }}
        >
          <div className="relative flex h-5 items-center justify-between gap-4 pr-1">
            <div className="text-muted-foreground flex min-w-0 flex-wrap items-center gap-2 text-[13px] leading-5 font-medium">
              <button
                type="button"
                aria-label={`${editing ? '当前正在编辑' : '编辑'}分段-${String(chunk.sequence).padStart(2, '0')}`}
                aria-pressed={editing}
                className={cn(
                  'hover:text-primary focus-visible:text-primary flex cursor-pointer items-center gap-1 transition-colors disabled:cursor-not-allowed disabled:opacity-50',
                  editing && 'text-primary',
                )}
                disabled={editDisabled}
                onClick={(event) => {
                  event.stopPropagation()
                  onEdit()
                }}
              >
                <Grip aria-hidden className="size-3.5" />
                分段-{String(chunk.sequence).padStart(2, '0')}
              </button>
              <span className="text-muted-foreground/50">·</span>
              <span>{chunk.characterCount} 字符</span>
              <span className="text-muted-foreground/50">·</span>
              <span>{chunk.recallCount} 召回次数</span>
            </div>

            <div className="text-muted-foreground flex shrink-0 items-center gap-2 text-[13px] group-focus-within/card:invisible group-hover/card:invisible">
              {pending ? (
                <>
                  <span>更新中</span>
                  <RefreshCw
                    aria-hidden
                    className="size-3.5 animate-spin motion-reduce:animate-none"
                  />
                </>
              ) : (
                <>
                  <span>{chunk.enabled ? '已启用' : '已禁用'}</span>
                  <span
                    aria-hidden
                    className={cn(
                      'size-2 rounded-[3px] border shadow-xs',
                      chunk.enabled
                        ? 'border-success/60 bg-success/70'
                        : 'border-muted-foreground/40 bg-muted-foreground/30',
                    )}
                  />
                </>
              )}
            </div>

            <div
              className="border-border bg-popover/95 pointer-events-none absolute -top-2 -right-2 z-10 flex items-center gap-0.5 rounded-[10px] border-[0.5px] p-1 opacity-0 shadow-lg backdrop-blur-[5px] transition-opacity group-focus-within/card:pointer-events-auto group-focus-within/card:opacity-100 group-hover/card:pointer-events-auto group-hover/card:opacity-100"
              onClick={(event) => event.stopPropagation()}
            >
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="text-muted-foreground size-7 rounded-lg"
                aria-label={`编辑分段-${String(chunk.sequence).padStart(2, '0')}`}
                disabled={editDisabled}
                onClick={onEdit}
              >
                <PencilLine aria-hidden className="size-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive focus-visible:bg-destructive/10 focus-visible:text-destructive size-7 rounded-lg"
                aria-label={`删除分段-${String(chunk.sequence).padStart(2, '0')}`}
                disabled={editDisabled}
                onClick={() => showToast('info', '暂不支持手动删除分段')}
              >
                <Trash2 aria-hidden className="size-4" />
              </Button>
              <div aria-hidden className="bg-border mx-1.5 h-3.5 w-px" />
              <Switch
                checked={chunk.enabled}
                disabled={updatingEnabled}
                aria-label={`${chunk.enabled ? '禁用' : '启用'}分段-${String(chunk.sequence).padStart(2, '0')}`}
                onCheckedChange={(checked) => onEnabledChange(Boolean(checked))}
              />
            </div>
          </div>

          <KnowledgeChunkContent>{chunk.content}</KnowledgeChunkContent>

          {tags.length > 0 ? (
            <div className="text-muted-foreground flex flex-wrap items-center gap-x-2 gap-y-1 py-1.5 text-xs">
              {tags.slice(0, 5).map((tag) => (
                <span key={tag} className="inline-flex min-w-0 items-center gap-0.5">
                  <span className="text-muted-foreground/60">#</span>
                  <span className="max-w-20 truncate">{tag}</span>
                </span>
              ))}
            </div>
          ) : typeof chunk.metadata.parentSequence === 'number' ? (
            <div className="text-muted-foreground py-1.5 text-xs">
              所属父分段 {chunk.metadata.parentSequence}
            </div>
          ) : null}
        </article>

        <div aria-hidden className="bg-border/60 mx-3 my-2 h-px" />
      </div>
    </div>
  )
}

export default function KnowledgeDocumentDetailPage() {
  const { id: knowledgeBaseId = '', documentId = '' } = useParams<{
      id: string
      documentId: string
    }>(),
    navigate = useNavigate(),
    { isResourceAvailable } = useOutletContext<KnowledgeBaseDetailOutletContext>(),
    [document, setDocument] = useState<KnowledgeDocumentDto>(),
    [chunks, setChunks] = useState<KnowledgeChunkDto[]>([]),
    [search, setSearch] = useState(''),
    [statusFilter, setStatusFilter] = useState<ChunkStatusFilter>('all'),
    [selectedChunkIds, setSelectedChunkIds] = useState<Set<string>>(() => new Set()),
    [updatingChunkIds, setUpdatingChunkIds] = useState<Set<string>>(() => new Set()),
    [batchUpdatingChunks, setBatchUpdatingChunks] = useState(false),
    [editingChunk, setEditingChunk] = useState<KnowledgeChunkDto>(),
    [savingChunk, setSavingChunk] = useState(false),
    [creatingChunk, setCreatingChunk] = useState(false),
    [savingCreatedChunk, setSavingCreatedChunk] = useState(false),
    [pendingCreatedChunk, setPendingCreatedChunk] = useState<KnowledgeChunkDto>(),
    [pendingCreatedChunkDocumentUpdatedAt, setPendingCreatedChunkDocumentUpdatedAt] =
      useState<string>(),
    [pendingCreatedChunkTargetCount, setPendingCreatedChunkTargetCount] = useState<number>(),
    [pageIndex, setPageIndex] = useState(0),
    [pageSize, setPageSize] = useState<number>(documentPageSizeOptions[0]),
    [total, setTotal] = useState(0),
    [loading, setLoading] = useState(true),
    [reindexing, setReindexing] = useState(false),
    [updatingEnabled, setUpdatingEnabled] = useState(false),
    [reloadVersion, setReloadVersion] = useState(0)

  useEffect(() => {
    if (!isResourceAvailable || !knowledgeBaseId || !documentId) return
    const controller = new AbortController()
    if (pendingCreatedChunkTargetCount === undefined) setLoading(true)
    const timer = globalThis.setTimeout(() => {
      void listKnowledgeChunks(
        knowledgeBaseId,
        documentId,
        {
          search: search.trim() || undefined,
          status: statusFilter === 'all' ? undefined : statusFilter,
          page: pageIndex + 1,
          pageSize,
        },
        controller.signal,
      )
        .then((result) => {
          setDocument(result.document)
          setSelectedChunkIds(new Set())
          const updateCompleted =
              pendingCreatedChunkTargetCount !== undefined &&
              result.document.chunkCount >= pendingCreatedChunkTargetCount,
            updateFailed =
              pendingCreatedChunkTargetCount !== undefined &&
              result.document.status === 'FAILED' &&
              result.document.updatedAt !== pendingCreatedChunkDocumentUpdatedAt

          if (updateCompleted) {
            setChunks(result.items)
            setTotal(result.total)
            setPendingCreatedChunk(undefined)
            setPendingCreatedChunkDocumentUpdatedAt(undefined)
            setPendingCreatedChunkTargetCount(undefined)
          } else if (updateFailed) {
            setChunks(result.items)
            setTotal(result.total)
            setPendingCreatedChunk(undefined)
            setPendingCreatedChunkDocumentUpdatedAt(undefined)
            setPendingCreatedChunkTargetCount(undefined)
            showToast('error', '分段更新失败，请检查文档状态后重试')
          } else if (pendingCreatedChunk) {
            const containsPendingChunk = result.items.some(
              (item) => item.id === pendingCreatedChunk.id,
            )
            setChunks(containsPendingChunk ? result.items : [...result.items, pendingCreatedChunk])
            setTotal(result.total + Number(!containsPendingChunk))
          } else {
            setChunks(result.items)
            setTotal(result.total)
          }
        })
        .catch(() => {
          if (!controller.signal.aborted && pendingCreatedChunkTargetCount !== undefined) {
            setChunks((currentChunks) =>
              currentChunks.filter((chunk) => chunk.id !== pendingCreatedChunk?.id),
            )
            setTotal((currentTotal) =>
              Math.max(currentTotal - Number(Boolean(pendingCreatedChunk)), 0),
            )
            setPendingCreatedChunk(undefined)
            setPendingCreatedChunkDocumentUpdatedAt(undefined)
            setPendingCreatedChunkTargetCount(undefined)
          }
        })
        .finally(() => {
          if (!controller.signal.aborted) setLoading(false)
        })
    }, 250)

    return () => {
      globalThis.clearTimeout(timer)
      controller.abort()
    }
  }, [
    documentId,
    isResourceAvailable,
    knowledgeBaseId,
    pageIndex,
    pageSize,
    pendingCreatedChunk,
    pendingCreatedChunkDocumentUpdatedAt,
    pendingCreatedChunkTargetCount,
    reloadVersion,
    search,
    statusFilter,
  ])

  useEffect(() => {
    if (pendingCreatedChunkTargetCount === undefined) return
    const timer = globalThis.setTimeout(() => {
      setReloadVersion((value) => value + 1)
    }, 1500)
    return () => globalThis.clearTimeout(timer)
  }, [pendingCreatedChunkTargetCount, reloadVersion])

  const selectedChunkCount = useMemo(
      () => chunks.reduce((count, chunk) => count + Number(selectedChunkIds.has(chunk.id)), 0),
      [chunks, selectedChunkIds],
    ),
    allPageChunksSelected = chunks.length > 0 && selectedChunkCount === chunks.length,
    selectedChunksHavePendingUpdate = chunks.some(
      (chunk) => selectedChunkIds.has(chunk.id) && updatingChunkIds.has(chunk.id),
    )

  async function handleReindex() {
    setReindexing(true)
    try {
      await reindexKnowledgeDocument(knowledgeBaseId, documentId)
      setReloadVersion((value) => value + 1)
      showToast('success', '文档分段已按当前设置更新')
    } finally {
      setReindexing(false)
    }
  }

  function handleDocumentChange(nextDocument: KnowledgeDocumentDto) {
    setDocument(nextDocument)
    setChunks([])
    setTotal(nextDocument.chunkCount)
    setSearch('')
    setStatusFilter('all')
    setSelectedChunkIds(new Set())
    setEditingChunk(undefined)
    setCreatingChunk(false)
    setPendingCreatedChunk(undefined)
    setPendingCreatedChunkDocumentUpdatedAt(undefined)
    setPendingCreatedChunkTargetCount(undefined)
    setPageIndex(0)
    void navigate(
      `/knowledge-base/${encodeURIComponent(knowledgeBaseId)}/documents/${encodeURIComponent(nextDocument.id)}`,
    )
  }

  function handleChunkSelectedChange(chunkId: string, selected: boolean) {
    setSelectedChunkIds((currentIds) => {
      const nextIds = new Set(currentIds)
      if (selected) nextIds.add(chunkId)
      else nextIds.delete(chunkId)
      return nextIds
    })
  }

  async function handleChunkEnabledChange(chunk: KnowledgeChunkDto, enabled: boolean) {
    if (updatingChunkIds.has(chunk.id)) return
    setUpdatingChunkIds((currentIds) => new Set(currentIds).add(chunk.id))
    setChunks((currentChunks) =>
      currentChunks.map((item) => (item.id === chunk.id ? { ...item, enabled } : item)),
    )
    try {
      const updatedChunk = await updateKnowledgeChunk(knowledgeBaseId, documentId, chunk.id, {
        enabled,
      })
      setChunks((currentChunks) =>
        currentChunks.map((item) => (item.id === updatedChunk.id ? updatedChunk : item)),
      )
      if (statusFilter !== 'all') setReloadVersion((value) => value + 1)
    } catch {
      setChunks((currentChunks) =>
        currentChunks.map((item) => (item.id === chunk.id ? chunk : item)),
      )
    } finally {
      setUpdatingChunkIds((currentIds) => {
        const nextIds = new Set(currentIds)
        nextIds.delete(chunk.id)
        return nextIds
      })
    }
  }

  async function handleSelectedChunksEnabledChange(enabled: boolean) {
    if (batchUpdatingChunks || selectedChunksHavePendingUpdate) return
    const selectedChunks = chunks.filter((chunk) => selectedChunkIds.has(chunk.id))
    if (selectedChunks.length === 0) return

    const selectedIds = new Set(selectedChunks.map((chunk) => chunk.id))
    setBatchUpdatingChunks(true)
    setUpdatingChunkIds((currentIds) => new Set([...currentIds, ...selectedIds]))

    try {
      const results = await Promise.allSettled(
          selectedChunks.map((chunk) =>
            updateKnowledgeChunk(knowledgeBaseId, documentId, chunk.id, {
              enabled,
            }),
          ),
        ),
        updatedChunks = results.flatMap((result) =>
          result.status === 'fulfilled' ? [result.value] : [],
        ),
        updatedChunksById = new Map(updatedChunks.map((chunk) => [chunk.id, chunk]))

      setChunks((currentChunks) =>
        currentChunks.map((chunk) => updatedChunksById.get(chunk.id) ?? chunk),
      )
      setSelectedChunkIds((currentIds) => {
        const nextIds = new Set(currentIds)
        updatedChunks.forEach((chunk) => nextIds.delete(chunk.id))
        return nextIds
      })

      if (updatedChunks.length > 0) {
        showToast('success', `已${enabled ? '启用' : '禁用'} ${updatedChunks.length} 个分段`)
        if (statusFilter !== 'all') setReloadVersion((value) => value + 1)
      }
    } finally {
      setUpdatingChunkIds((currentIds) => {
        const nextIds = new Set(currentIds)
        selectedIds.forEach((id) => nextIds.delete(id))
        return nextIds
      })
      setBatchUpdatingChunks(false)
    }
  }

  async function handleChunkContentSave(content: string) {
    if (!editingChunk || savingChunk) return
    const previousChunk = editingChunk
    setSavingChunk(true)
    try {
      const updatedChunk = await updateKnowledgeChunk(
        knowledgeBaseId,
        documentId,
        previousChunk.id,
        { content },
      )
      setChunks((currentChunks) =>
        currentChunks.map((item) => (item.id === previousChunk.id ? updatedChunk : item)),
      )
      setSelectedChunkIds((currentIds) => {
        if (!currentIds.has(previousChunk.id)) return currentIds
        const nextIds = new Set(currentIds)
        nextIds.delete(previousChunk.id)
        nextIds.add(updatedChunk.id)
        return nextIds
      })
      setDocument((currentDocument) =>
        currentDocument
          ? {
              ...currentDocument,
              characterCount:
                currentDocument.characterCount -
                previousChunk.characterCount +
                updatedChunk.characterCount,
            }
          : currentDocument,
      )
      setEditingChunk(undefined)
      showToast('success', '分段内容已保存')
    } catch {
      // 请求错误由统一 API Client 展示，保留面板便于重试。
    } finally {
      setSavingChunk(false)
    }
  }

  async function handleChunkCreate(content: string) {
    if (!document || savingCreatedChunk) return
    setSavingCreatedChunk(true)
    try {
      const createdChunk = await createKnowledgeChunk(knowledgeBaseId, documentId, { content })
      setChunks((currentChunks) =>
        currentChunks.some((chunk) => chunk.id === createdChunk.id)
          ? currentChunks
          : [...currentChunks, createdChunk],
      )
      setTotal((currentTotal) => currentTotal + 1)
      setPendingCreatedChunk(createdChunk)
      setPendingCreatedChunkDocumentUpdatedAt(document.updatedAt)
      setPendingCreatedChunkTargetCount(document.chunkCount + 1)
      setCreatingChunk(false)
      showToast('success', '分段已提交，正在更新索引')
    } finally {
      setSavingCreatedChunk(false)
    }
  }

  async function handleEnabledChange(checked: boolean) {
    if (!document || updatingEnabled) return
    const previousDocument = document
    setDocument({ ...document, enabled: checked })
    setUpdatingEnabled(true)
    try {
      const updatedDocument = await updateKnowledgeDocument(knowledgeBaseId, document.id, {
        enabled: checked,
      })
      setDocument((currentDocument) =>
        currentDocument?.id === updatedDocument.id ? updatedDocument : currentDocument,
      )
    } catch {
      setDocument((currentDocument) =>
        currentDocument?.id === previousDocument.id ? previousDocument : currentDocument,
      )
    } finally {
      setUpdatingEnabled(false)
    }
  }

  if (!isResourceAvailable) {
    return (
      <div className="text-muted-foreground flex h-full items-center justify-center text-sm">
        知识库不可用或正在加载
      </div>
    )
  }

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <header className="border-border flex min-h-16 shrink-0 items-center gap-3 border-b px-6">
        <Button
          asChild
          type="button"
          variant="ghost"
          size="icon-sm"
          className="before:bg-muted dark:before:bg-muted/50 relative w-4 justify-start before:absolute before:top-0 before:left-0 before:size-8 before:-translate-x-2 before:rounded-lg before:opacity-0 before:transition-opacity hover:bg-transparent hover:before:opacity-100 focus-visible:bg-transparent focus-visible:before:opacity-100 dark:hover:bg-transparent dark:focus-visible:bg-transparent"
        >
          <Link
            to={`/knowledge-base/${encodeURIComponent(knowledgeBaseId)}/documents`}
            aria-label="返回文档列表"
          >
            <ArrowLeft aria-hidden className="relative z-10 size-4" />
          </Link>
        </Button>

        <KnowledgeDocumentSwitcher
          document={document}
          knowledgeBaseId={knowledgeBaseId}
          onDocumentChange={handleDocumentChange}
        />

        <div className="ml-auto flex shrink-0 items-center gap-3">
          {document?.needsReindex ? (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={reindexing}
              onClick={() => void handleReindex()}
            >
              <RefreshCw aria-hidden className="size-4" />
              {reindexing ? '更新中…' : '更新分段'}
            </Button>
          ) : null}

          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="text-primary"
            disabled={
              !document ||
              document.status === 'PROCESSING' ||
              savingCreatedChunk ||
              pendingCreatedChunkTargetCount !== undefined
            }
            onClick={() => {
              setEditingChunk(undefined)
              setCreatingChunk(true)
            }}
          >
            <Plus aria-hidden className="size-4" />
            {pendingCreatedChunkTargetCount !== undefined ? '分段更新中…' : '添加分段'}
          </Button>

          <div className="border-button-secondary-border bg-button-secondary-bg flex h-8 items-center gap-1.5 rounded-lg border-[0.5px] px-3.5 text-[13px] leading-4 shadow-xs backdrop-blur-[5px]">
            <span
              aria-hidden
              className={cn(
                'block size-2 shrink-0 rounded-[3px] border border-solid shadow-xs',
                document?.enabled
                  ? 'border-success/40 bg-success/40'
                  : 'border-muted-foreground/40 bg-muted-foreground/30',
              )}
            />
            <span
              className={
                document?.enabled
                  ? 'text-success font-semibold'
                  : 'text-muted-foreground font-semibold'
              }
            >
              {document?.enabled ? '可用' : '不可用'}
            </span>
            <Switch
              checked={Boolean(document?.enabled)}
              disabled={!document || updatingEnabled}
              aria-label={document?.enabled ? '禁用文档' : '启用文档'}
              onCheckedChange={(checked) => void handleEnabledChange(Boolean(checked))}
            />
          </div>
        </div>
      </header>

      <div className="relative grid min-h-0 flex-1 grid-cols-1 overflow-hidden xl:grid-cols-[minmax(0,1fr)_340px]">
        <section className="relative flex min-h-0 flex-col overflow-hidden pt-3 pr-11 pb-2 pl-5">
          <div className="flex shrink-0 items-center gap-4 pr-2">
            <Checkbox
              aria-label="全选当前页分段"
              checked={
                loading
                  ? false
                  : allPageChunksSelected
                    ? true
                    : selectedChunkCount > 0
                      ? 'indeterminate'
                      : false
              }
              disabled={
                loading ||
                chunks.length === 0 ||
                batchUpdatingChunks ||
                pendingCreatedChunkTargetCount !== undefined
              }
              onCheckedChange={(checked) => {
                const nextIds = checked === true ? chunks.map(({ id }) => id) : []
                setSelectedChunkIds(new Set(nextIds))
              }}
            />
            <span className="text-sm font-semibold">{total} 分段</span>

            <div className="ml-auto flex min-w-0 items-center gap-2">
              <Select
                value={statusFilter}
                onValueChange={(value) => {
                  setStatusFilter(value as ChunkStatusFilter)
                  setPageIndex(0)
                }}
              >
                <SelectTrigger
                  size="sm"
                  aria-label="分段状态"
                  className="w-42 justify-between rounded-lg px-2.5 text-left"
                >
                  <span className="flex min-w-0 items-center gap-1.5">
                    <span className="text-muted-foreground shrink-0">分段状态</span>
                    <SelectValue />
                  </span>
                </SelectTrigger>
                <SelectContent
                  position="popper"
                  align="start"
                  sideOffset={4}
                  className="w-(--radix-select-trigger-width)"
                >
                  {(Object.keys(chunkStatusFilterLabels) as ChunkStatusFilter[]).map((value) => (
                    <SelectItem
                      key={value}
                      value={value}
                      className="data-[state=checked]:bg-accent"
                    >
                      {chunkStatusFilterLabels[value]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <div className="relative min-w-0 max-sm:w-full sm:min-w-44">
                <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
                <Input
                  value={search}
                  onChange={(event) => {
                    setSearch(event.target.value)
                    setPageIndex(0)
                  }}
                  placeholder="搜索分段"
                  aria-label="搜索分段内容"
                  className="bg-input focus-visible:bg-background h-8 rounded-lg border-transparent pr-3 pl-9 text-sm shadow-none"
                />
              </div>
            </div>
          </div>

          <div className="mt-3 min-h-0 flex-1 overflow-auto pr-2">
            {loading ? (
              <ChunkListSkeleton count={Math.min(pageSize, 6)} />
            ) : chunks.length > 0 ? (
              <div>
                {chunks.map((chunk) => (
                  <ChunkItem
                    key={chunk.id}
                    chunk={chunk}
                    editing={editingChunk?.id === chunk.id}
                    editDisabled={savingChunk || pendingCreatedChunkTargetCount !== undefined}
                    pending={pendingCreatedChunk?.id === chunk.id}
                    selected={selectedChunkIds.has(chunk.id)}
                    selectionDisabled={
                      batchUpdatingChunks || pendingCreatedChunkTargetCount !== undefined
                    }
                    updatingEnabled={
                      updatingChunkIds.has(chunk.id) || pendingCreatedChunkTargetCount !== undefined
                    }
                    onEdit={() => {
                      setCreatingChunk(false)
                      setEditingChunk(chunk)
                    }}
                    onSelectedChange={(selected) => handleChunkSelectedChange(chunk.id, selected)}
                    onEnabledChange={(enabled) => void handleChunkEnabledChange(chunk, enabled)}
                  />
                ))}
              </div>
            ) : (
              <div className="text-muted-foreground flex min-h-48 items-center justify-center text-sm">
                没有匹配的分段
              </div>
            )}
          </div>

          {!loading ? (
            <KnowledgeSelectionActions
              ariaLabel="已选择分段操作"
              busy={batchUpdatingChunks}
              count={selectedChunkCount}
              disableActions={
                selectedChunksHavePendingUpdate || pendingCreatedChunkTargetCount !== undefined
              }
              onEnable={() => void handleSelectedChunksEnabledChange(true)}
              onDisable={() => void handleSelectedChunksEnabledChange(false)}
              onDelete={() => showToast('info', '暂不支持手动删除分段')}
              onCancel={() => setSelectedChunkIds(new Set())}
            />
          ) : null}

          <Pagination
            className="shrink-0"
            pageIndex={pageIndex}
            pageCount={Math.max(Math.ceil(total / pageSize), 1)}
            pageSize={pageSize}
            pageSizeOptions={documentPageSizeOptions}
            onPageChange={setPageIndex}
            onPageSizeChange={(value) => {
              setPageSize(value)
              setPageIndex(0)
            }}
          />
        </section>

        <aside className="min-h-0 overflow-auto py-3 pt-3 pr-5">
          <KnowledgeDocumentMetadataPanel
            disabled={!document || document.status === 'PROCESSING'}
            document={document}
            knowledgeBaseId={knowledgeBaseId}
            onDocumentChange={setDocument}
          />

          <div className="pl-2">
            <h2 className="mt-7 text-xs leading-5 font-semibold">文档信息</h2>
            {document ? (
              <>
                <dl className="mt-3 grid grid-cols-[8rem_minmax(0,1fr)] gap-x-2 gap-y-1 text-xs leading-4">
                  <dt className="text-muted-foreground truncate py-1 font-medium">原始文件名称</dt>
                  <dd className="min-w-0 py-1 break-all">{document.name}</dd>
                  <dt className="text-muted-foreground truncate py-1 font-medium">原始文件大小</dt>
                  <dd className="min-w-0 py-1">{formatBytes(document.sourceSize)}</dd>
                  <dt className="text-muted-foreground truncate py-1 font-medium">上传日期</dt>
                  <dd className="min-w-0 py-1">
                    {dateFormatter.format(new Date(document.createdAt))}
                  </dd>
                  <dt className="text-muted-foreground truncate py-1 font-medium">最后更新</dt>
                  <dd className="min-w-0 py-1">
                    {dateFormatter.format(new Date(document.updatedAt))}
                  </dd>
                  <dt className="text-muted-foreground truncate py-1 font-medium">状态</dt>
                  <dd className="min-w-0 py-1">
                    <span
                      className={cn(
                        'inline-flex items-center gap-1.5 font-medium',
                        document.enabled
                          ? document.needsReindex
                            ? 'text-warning'
                            : 'text-success'
                          : 'text-muted-foreground',
                      )}
                    >
                      <span
                        aria-hidden
                        className={cn(
                          'size-2 shrink-0 rounded-[3px] border border-solid shadow-xs',
                          document.enabled
                            ? document.needsReindex
                              ? 'border-warning/40 bg-warning/40'
                              : 'border-success/40 bg-success/40'
                            : 'border-muted-foreground/40 bg-muted-foreground/30',
                        )}
                      />
                      {document.enabled ? (document.needsReindex ? '待更新' : '已启用') : '已禁用'}
                    </span>
                  </dd>
                </dl>

                <h2 className="mt-6 text-xs leading-5 font-semibold">技术参数</h2>
                <dl className="mt-3 grid grid-cols-[8rem_minmax(0,1fr)] gap-x-2 gap-y-1 text-xs leading-4">
                  <dt className="text-muted-foreground truncate py-1 font-medium">分段模式</dt>
                  <dd className="min-w-0 py-1">
                    {knowledgeSegmentationModeLabels[document.segmentationMode]}
                  </dd>
                  <dt className="text-muted-foreground truncate py-1 font-medium">最大长度</dt>
                  <dd className="min-w-0 py-1">{document.maxSegmentLength} 字符</dd>
                  <dt className="text-muted-foreground truncate py-1 font-medium">重叠长度</dt>
                  <dd className="min-w-0 py-1">{document.overlapLength} 字符</dd>
                  <dt className="text-muted-foreground truncate py-1 font-medium">字符数</dt>
                  <dd className="min-w-0 py-1">{document.characterCount}</dd>
                  <dt className="text-muted-foreground truncate py-1 font-medium">分段数量</dt>
                  <dd className="min-w-0 py-1">{document.chunkCount}</dd>
                </dl>
              </>
            ) : (
              <DocumentInformationSkeleton />
            )}
          </div>
        </aside>

        <FloatingSidePanel
          ariaLabel={
            creatingChunk
              ? '添加分段'
              : editingChunk
                ? `编辑分段-${String(editingChunk.sequence).padStart(2, '0')}`
                : '编辑分段'
          }
          closeDisabled={savingChunk || savingCreatedChunk}
          open={creatingChunk || Boolean(editingChunk)}
          onClose={() => {
            if (!savingChunk && !savingCreatedChunk) {
              setEditingChunk(undefined)
              setCreatingChunk(false)
            }
          }}
        >
          {creatingChunk ? (
            <KnowledgeChunkCreatePanel
              saving={savingCreatedChunk}
              sequence={total + 1}
              onClose={() => {
                if (!savingCreatedChunk) setCreatingChunk(false)
              }}
              onSave={handleChunkCreate}
            />
          ) : editingChunk ? (
            <KnowledgeChunkEditPanel
              key={editingChunk.id}
              chunk={editingChunk}
              saving={savingChunk}
              onClose={() => {
                if (!savingChunk) setEditingChunk(undefined)
              }}
              onSave={handleChunkContentSave}
            />
          ) : null}
        </FloatingSidePanel>
      </div>
    </div>
  )
}
