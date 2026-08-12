import { listKnowledgeDocuments, type KnowledgeDocumentDto } from '@/api/knowledge-bases'
import { Button } from '@ai-workflow/ui/components/button'
import { Input } from '@ai-workflow/ui/components/input'
import { Popover, PopoverContent, PopoverTrigger } from '@ai-workflow/ui/components/popover'
import { Skeleton } from '@ai-workflow/ui/components/skeleton'
import { useVirtualizer } from '@tanstack/react-virtual'
import { ChevronDown, LoaderCircle, Search } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

import { knowledgeSegmentationModeLabels } from '../constants'
import { DocumentFileTypeIcon } from './document-file-type-icon'

const documentOptionPageSize = 50,
  documentOptionRowHeight = 32

interface KnowledgeDocumentSwitcherProps {
  document?: KnowledgeDocumentDto
  knowledgeBaseId: string
  onDocumentChange: (document: KnowledgeDocumentDto) => void
}

export function KnowledgeDocumentSwitcher({
  document,
  knowledgeBaseId,
  onDocumentChange,
}: KnowledgeDocumentSwitcherProps) {
  const [documentOptions, setDocumentOptions] = useState<KnowledgeDocumentDto[]>([]),
    [search, setSearch] = useState(''),
    [open, setOpen] = useState(false),
    [loading, setLoading] = useState(false),
    [loadError, setLoadError] = useState(false),
    [page, setPage] = useState(1),
    [requestVersion, setRequestVersion] = useState(0),
    [total, setTotal] = useState(0),
    scrollRef = useRef<HTMLDivElement>(null),
    hasMore = documentOptions.length < total,
    showStatusRow = hasMore || loading || loadError || page > 1,
    virtualizer = useVirtualizer({
      count: documentOptions.length + (showStatusRow ? 1 : 0),
      enabled: open,
      estimateSize: () => documentOptionRowHeight,
      getItemKey: (index) => documentOptions[index]?.id ?? `document-option-status-${index}`,
      getScrollElement: () => scrollRef.current,
      overscan: 5,
    }),
    virtualRows = virtualizer.getVirtualItems(),
    lastVirtualRowIndex = virtualRows.at(-1)?.index

  useEffect(() => {
    if (!open || !knowledgeBaseId) return
    const controller = new AbortController()
    setLoading(true)
    const timer = globalThis.setTimeout(
      () => {
        void listKnowledgeDocuments(
          knowledgeBaseId,
          {
            search: search.trim() || undefined,
            sort: 'uploaded_desc',
            page,
            pageSize: documentOptionPageSize,
          },
          controller.signal,
        )
          .then((result) => {
            if (controller.signal.aborted) return
            setDocumentOptions((currentOptions) => {
              const nextOptions =
                page === 1 ? [...result.items] : [...currentOptions, ...result.items]
              if (
                page === 1 &&
                !search.trim() &&
                document &&
                !nextOptions.some((option) => option.id === document.id)
              ) {
                nextOptions.unshift(document)
              }
              return [...new Map(nextOptions.map((option) => [option.id, option])).values()]
            })
            setTotal(result.total)
            setLoadError(false)
          })
          .catch(() => {
            if (!controller.signal.aborted) setLoadError(true)
          })
          .finally(() => {
            if (!controller.signal.aborted) setLoading(false)
          })
      },
      page === 1 ? 250 : 0,
    )

    return () => {
      globalThis.clearTimeout(timer)
      controller.abort()
    }
  }, [document, knowledgeBaseId, open, page, requestVersion, search])

  useEffect(() => {
    if (
      lastVirtualRowIndex === undefined ||
      lastVirtualRowIndex < documentOptions.length ||
      !hasMore ||
      loading ||
      loadError
    ) {
      return
    }

    setLoading(true)
    setPage((currentPage) => currentPage + 1)
  }, [documentOptions.length, hasMore, lastVirtualRowIndex, loadError, loading])

  function resetOptions(nextLoading: boolean) {
    setSearch('')
    setDocumentOptions([])
    setLoadError(false)
    setLoading(nextLoading)
    setPage(1)
    setTotal(0)
  }

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen)
    resetOptions(nextOpen)
  }

  function handleSearchChange(value: string) {
    setSearch(value)
    setDocumentOptions([])
    setLoadError(false)
    setLoading(true)
    setPage(1)
    setTotal(0)
    scrollRef.current?.scrollTo({ top: 0 })
  }

  function handleRetry() {
    setLoadError(false)
    setLoading(true)
    setRequestVersion((version) => version + 1)
  }

  function handleSelect(option: KnowledgeDocumentDto) {
    setOpen(false)
    resetOptions(false)
    onDocumentChange(option)
  }

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          className="h-auto max-w-[260px] min-w-0 justify-start gap-1.5 rounded-lg px-1.5 py-1"
          aria-label="切换文档"
        >
          {document ? (
            <DocumentFileTypeIcon
              fileName={document.name}
              fileType={document.fileType}
              className="size-5 shrink-0 object-contain"
            />
          ) : (
            <Skeleton aria-hidden className="size-5 shrink-0" />
          )}
          <span className="min-w-0 flex-1 text-left">
            <span className="block truncate text-sm leading-4 font-semibold">
              {document?.name ?? '文档分段'}
            </span>
            <span className="text-muted-foreground block text-[10px] leading-3">
              {document ? knowledgeSegmentationModeLabels[document.segmentationMode] : '正在加载'}
            </span>
          </span>
          <ChevronDown
            aria-hidden
            className="text-muted-foreground size-3.5 shrink-0 transition-transform group-aria-expanded/button:rotate-180 motion-reduce:transition-none"
          />
        </Button>
      </PopoverTrigger>

      <PopoverContent
        align="start"
        className="w-[min(320px,calc(100vw-2rem))] p-2"
        onOpenAutoFocus={(event) => event.preventDefault()}
      >
        <div className="relative">
          <Search
            aria-hidden
            className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2"
          />
          <Input
            value={search}
            onChange={(event) => handleSearchChange(event.target.value)}
            aria-label="搜索文档"
            placeholder="搜索文档"
            className="h-8 pl-8 text-xs"
          />
        </div>

        <div ref={scrollRef} className="mt-1.5 max-h-56 overflow-auto">
          {loading && !documentOptions.length ? (
            <div
              role="status"
              className="text-muted-foreground flex min-h-16 items-center justify-center gap-1.5 text-[10px]"
            >
              <LoaderCircle
                aria-hidden
                className="size-3 animate-spin motion-reduce:animate-none"
              />
              正在加载文档
            </div>
          ) : documentOptions.length ? (
            <div className="relative w-full" style={{ height: virtualizer.getTotalSize() }}>
              {virtualRows.map((virtualRow) => {
                const option = documentOptions[virtualRow.index]
                return (
                  <div
                    key={virtualRow.key}
                    className="absolute top-0 left-0 w-full"
                    style={{ transform: `translateY(${virtualRow.start}px)` }}
                  >
                    {option ? (
                      <Button
                        type="button"
                        variant="ghost"
                        className="h-8 w-full justify-start gap-1.5 px-1.5 text-left"
                        aria-current={option.id === document?.id ? 'page' : undefined}
                        onClick={() => handleSelect(option)}
                      >
                        <DocumentFileTypeIcon
                          fileName={option.name}
                          fileType={option.fileType}
                          className="size-5 shrink-0 object-contain"
                        />
                        <span className="min-w-0 flex-1 truncate text-sm font-medium">
                          {option.name}
                        </span>
                        {option.id === document?.id ? (
                          <span className="text-primary text-[10px] font-medium">当前</span>
                        ) : null}
                      </Button>
                    ) : loadError ? (
                      <Button
                        type="button"
                        variant="ghost"
                        className="text-muted-foreground h-8 w-full text-[10px]"
                        onClick={handleRetry}
                      >
                        加载失败，点击重试
                      </Button>
                    ) : loading || hasMore ? (
                      <div
                        role="status"
                        className="text-muted-foreground flex h-8 items-center justify-center gap-1.5 text-[10px]"
                      >
                        <LoaderCircle
                          aria-hidden
                          className="size-3 animate-spin motion-reduce:animate-none"
                        />
                        正在加载更多
                      </div>
                    ) : (
                      <div className="text-muted-foreground flex h-8 items-center justify-center text-[9px]">
                        已加载全部文档
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="text-muted-foreground flex min-h-16 items-center justify-center text-[10px]">
              {loadError ? (
                <Button type="button" variant="ghost" size="xs" onClick={handleRetry}>
                  加载失败，点击重试
                </Button>
              ) : (
                '没有匹配的文档'
              )}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
