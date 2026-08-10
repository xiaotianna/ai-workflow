import {
  listKnowledgeChunks,
  reindexKnowledgeDocument,
  type KnowledgeChunkDto,
  type KnowledgeDocumentDto,
} from '@/api/knowledge-bases'
import { Badge } from '@ai-workflow/ui/components/badge'
import { Button } from '@ai-workflow/ui/components/button'
import { Input } from '@ai-workflow/ui/components/input'
import { Pagination } from '@ai-workflow/ui/components/pagination'
import { showToast } from '@ai-workflow/ui/lib/toast'
import { ArrowLeft, FileText, RefreshCw, Search } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useOutletContext, useParams } from 'react-router-dom'

import { documentPageSizeOptions } from '@/features/knowledge-base'

import type { KnowledgeBaseDetailOutletContext } from '.'

const dateFormatter = new Intl.DateTimeFormat('zh-CN', {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
})

const segmentationLabels = {
  GENERAL: '通用',
  QA: 'Q&A',
  PARENT_CHILD: '父子分段',
} as const

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
  const { isResourceAvailable } = useOutletContext<KnowledgeBaseDetailOutletContext>()
  const [document, setDocument] = useState<KnowledgeDocumentDto>()
  const [chunks, setChunks] = useState<KnowledgeChunkDto[]>([])
  const [search, setSearch] = useState('')
  const [pageIndex, setPageIndex] = useState(0)
  const [pageSize, setPageSize] = useState<number>(documentPageSizeOptions[0])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [reindexing, setReindexing] = useState(false)
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
        <Button asChild type="button" variant="ghost" size="icon-sm">
          <Link
            to={`/knowledge-base/${encodeURIComponent(knowledgeBaseId)}/documents`}
            aria-label="返回文档列表"
          >
            <ArrowLeft aria-hidden className="size-4" />
          </Link>
        </Button>
        <span className="bg-primary/8 text-primary flex size-8 shrink-0 items-center justify-center rounded-lg">
          <FileText aria-hidden className="size-4" />
        </span>
        <div className="min-w-0">
          <h1 className="truncate text-sm font-semibold">{document?.name ?? '文档分段'}</h1>
          <p className="text-muted-foreground mt-0.5 text-xs">{total} 个分段</p>
        </div>
        {document?.needsReindex ? (
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="ml-auto"
            disabled={reindexing}
            onClick={() => void handleReindex()}
          >
            <RefreshCw aria-hidden className="size-4" />
            {reindexing ? '更新中…' : '按当前设置更新分段'}
          </Button>
        ) : null}
      </header>

      <div className="grid min-h-0 flex-1 grid-cols-1 overflow-hidden xl:grid-cols-[minmax(0,1fr)_340px]">
        <section className="flex min-h-0 flex-col overflow-hidden px-6 pt-5 pb-2">
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

        <aside className="border-border min-h-0 overflow-auto border-l px-6 py-5">
          <h2 className="text-sm font-semibold">文档信息</h2>
          {document ? (
            <>
              <dl className="mt-4 grid grid-cols-[7rem_1fr] gap-x-3 gap-y-3 text-sm">
                <dt className="text-muted-foreground">原始文件名称</dt>
                <dd className="break-all">{document.name}</dd>
                <dt className="text-muted-foreground">原始文件大小</dt>
                <dd>{formatBytes(document.sourceSize)}</dd>
                <dt className="text-muted-foreground">上传日期</dt>
                <dd>{dateFormatter.format(new Date(document.createdAt))}</dd>
                <dt className="text-muted-foreground">最后更新</dt>
                <dd>{dateFormatter.format(new Date(document.updatedAt))}</dd>
                <dt className="text-muted-foreground">状态</dt>
                <dd>
                  <Badge variant="secondary">
                    {document.enabled ? (document.needsReindex ? '待更新' : '已启用') : '已禁用'}
                  </Badge>
                </dd>
              </dl>

              <h2 className="mt-7 text-sm font-semibold">技术参数</h2>
              <dl className="mt-4 grid grid-cols-[7rem_1fr] gap-x-3 gap-y-3 text-sm">
                <dt className="text-muted-foreground">分段模式</dt>
                <dd>{segmentationLabels[document.segmentationMode]}</dd>
                <dt className="text-muted-foreground">最大长度</dt>
                <dd>{document.maxSegmentLength} 字符</dd>
                <dt className="text-muted-foreground">重叠长度</dt>
                <dd>{document.overlapLength} 字符</dd>
                <dt className="text-muted-foreground">字符数</dt>
                <dd>{document.characterCount}</dd>
                <dt className="text-muted-foreground">分段数量</dt>
                <dd>{document.chunkCount}</dd>
              </dl>
            </>
          ) : null}
        </aside>
      </div>
    </div>
  )
}
