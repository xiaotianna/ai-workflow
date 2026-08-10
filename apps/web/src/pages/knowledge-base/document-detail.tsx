import {
  listKnowledgeChunks,
  reindexKnowledgeDocument,
  updateKnowledgeDocument,
  type KnowledgeChunkDto,
  type KnowledgeDocumentDto,
} from '@/api/knowledge-bases'
import { Button } from '@ai-workflow/ui/components/button'
import { Input } from '@ai-workflow/ui/components/input'
import { Pagination } from '@ai-workflow/ui/components/pagination'
import { Switch } from '@ai-workflow/ui/components/switch'
import { showToast } from '@ai-workflow/ui/lib/toast'
import { cn } from '@ai-workflow/ui/lib/utils'
import { ArrowLeft, ArrowRight, Plus, RefreshCw, Search } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useNavigate, useOutletContext, useParams } from 'react-router-dom'

import {
  documentPageSizeOptions,
  KnowledgeDocumentSwitcher,
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

function ChunkItem({ chunk }: { chunk: KnowledgeChunkDto }) {
  return (
    <article className="border-border border-b py-5 last:border-b-0">
      <div className="text-muted-foreground flex flex-wrap items-center gap-2 text-xs">
        <span className="text-foreground font-medium">
          分段-{String(chunk.sequence).padStart(2, '0')}
        </span>
        <span>·</span>
        <span>{chunk.characterCount} 字符</span>
      </div>
      <p className="text-foreground mt-2 text-sm leading-7 whitespace-pre-wrap">{chunk.content}</p>
      {typeof chunk.metadata.parentSequence === 'number' ? (
        <div className="text-muted-foreground mt-3 text-xs">
          所属父分段 {chunk.metadata.parentSequence}
        </div>
      ) : null}
    </article>
  )
}

export default function KnowledgeDocumentDetailPage() {
  const { id: knowledgeBaseId = '', documentId = '' } = useParams<{
    id: string
    documentId: string
  }>()
  const navigate = useNavigate()
  const { isResourceAvailable } = useOutletContext<KnowledgeBaseDetailOutletContext>()
  const [document, setDocument] = useState<KnowledgeDocumentDto>()
  const [chunks, setChunks] = useState<KnowledgeChunkDto[]>([])
  const [search, setSearch] = useState('')
  const [pageIndex, setPageIndex] = useState(0)
  const [pageSize, setPageSize] = useState<number>(documentPageSizeOptions[0])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [reindexing, setReindexing] = useState(false)
  const [updatingEnabled, setUpdatingEnabled] = useState(false)
  const [reloadVersion, setReloadVersion] = useState(0)

  useEffect(() => {
    if (!isResourceAvailable || !knowledgeBaseId || !documentId) return
    const controller = new AbortController()
    const timer = globalThis.setTimeout(() => {
      setLoading(true)
      void listKnowledgeChunks(
        knowledgeBaseId,
        documentId,
        { search: search.trim() || undefined, page: pageIndex + 1, pageSize },
        controller.signal,
      )
        .then((result) => {
          setDocument(result.document)
          setChunks(result.items)
          setTotal(result.total)
        })
        .catch(() => undefined)
        .finally(() => {
          if (!controller.signal.aborted) setLoading(false)
        })
    }, 250)

    return () => {
      globalThis.clearTimeout(timer)
      controller.abort()
    }
  }, [documentId, isResourceAvailable, knowledgeBaseId, pageIndex, pageSize, reloadVersion, search])

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
    setPageIndex(0)
    void navigate(
      `/knowledge-base/${encodeURIComponent(knowledgeBaseId)}/documents/${encodeURIComponent(nextDocument.id)}`,
    )
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
            onClick={() => showToast('info', '暂不支持手动新增分段')}
          >
            <Plus aria-hidden className="size-4" />
            添加分段
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

      <div className="grid min-h-0 flex-1 grid-cols-1 overflow-hidden xl:grid-cols-[minmax(0,1fr)_340px]">
        <section className="flex min-h-0 flex-col overflow-hidden pt-3 pr-11 pb-2 pl-5">
          <div className="flex shrink-0 items-center gap-3">
            <span className="text-sm font-semibold">{total} 个分段</span>
            <div className="relative ml-auto w-72 max-w-full">
              <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
              <Input
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value)
                  setPageIndex(0)
                }}
                placeholder="搜索分段内容"
                aria-label="搜索分段内容"
                className="pl-9"
              />
            </div>
          </div>

          <div className="mt-3 min-h-0 flex-1 overflow-auto pr-2">
            {loading && chunks.length === 0 ? (
              <div className="text-muted-foreground flex min-h-48 items-center justify-center text-sm">
                正在加载分段
              </div>
            ) : chunks.length > 0 ? (
              chunks.map((chunk) => <ChunkItem key={chunk.id} chunk={chunk} />)
            ) : (
              <div className="text-muted-foreground flex min-h-48 items-center justify-center text-sm">
                没有匹配的分段
              </div>
            )}
          </div>

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
          <section className="bg-input rounded-xl p-4">
            <h2 className="text-foreground text-xs leading-5 font-semibold">元数据</h2>
            <p className="text-muted-foreground mt-1 text-xs leading-5">
              元数据是关于文档的数据，用于描述文档的属性。元数据可以帮助您更好地组织和管理文档。
            </p>
            <Button
              type="button"
              size="sm"
              className="mt-2"
              onClick={() => showToast('info', '暂不支持元数据标注')}
            >
              开始标注
              <ArrowRight aria-hidden className="size-4" />
            </Button>
          </section>

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
            ) : null}
          </div>
        </aside>
      </div>
    </div>
  )
}
