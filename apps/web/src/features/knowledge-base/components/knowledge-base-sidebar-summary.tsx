import { getKnowledgeBaseStatistics, type KnowledgeBaseStatisticsDto } from '@/api/knowledge-bases'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@ai-workflow/ui/components/dropdown-menu'
import { Skeleton } from '@ai-workflow/ui/components/skeleton'
import { BookOpenText, ExternalLink, Info, Network } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

interface KnowledgeBaseSidebarSummaryProps {
  knowledgeBaseId?: string
}

type StatisticsState =
  | { knowledgeBaseId: string | undefined; status: 'loading' | 'error' }
  | {
      knowledgeBaseId: string
      status: 'success'
      statistics: KnowledgeBaseStatisticsDto
    }

function SidebarMetric({
  value,
  label,
  loading,
}: {
  value?: number
  label: string
  loading: boolean
}) {
  return (
    <div className="flex min-w-0 flex-col rounded-md px-1.5 py-0.5">
      {loading ? (
        <Skeleton className="mb-0.5 h-4 w-5" role="status" aria-label={`${label}统计加载中`} />
      ) : (
        <span className="text-foreground text-sm leading-4 font-semibold">{value ?? '—'}</span>
      )}
      <span className="text-muted-foreground flex min-w-0 items-center gap-0.5 text-[10px] leading-3 font-medium">
        <span className="truncate">{label}</span>
        {label === '个关联应用' ? (
          <Info
            role="img"
            aria-label="统计草稿或历史版本中引用此知识库的应用数量"
            className="size-3 shrink-0"
          />
        ) : undefined}
      </span>
    </div>
  )
}

export function KnowledgeBaseSidebarSummary({ knowledgeBaseId }: KnowledgeBaseSidebarSummaryProps) {
  const [statisticsState, setStatisticsState] = useState<StatisticsState>({
    knowledgeBaseId,
    status: 'loading',
  })

  useEffect(() => {
    if (!knowledgeBaseId) {
      setStatisticsState({ knowledgeBaseId, status: 'loading' })
      return
    }

    const controller = new AbortController()
    setStatisticsState({ knowledgeBaseId, status: 'loading' })
    void getKnowledgeBaseStatistics(knowledgeBaseId, controller.signal)
      .then((statistics) => {
        setStatisticsState({ knowledgeBaseId, status: 'success', statistics })
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setStatisticsState({ knowledgeBaseId, status: 'error' })
        }
      })

    return () => controller.abort()
  }, [knowledgeBaseId])

  const isCurrentStatistics = statisticsState.knowledgeBaseId === knowledgeBaseId
  const statistics =
    isCurrentStatistics && statisticsState.status === 'success'
      ? statisticsState.statistics
      : undefined
  const loading = !isCurrentStatistics || statisticsState.status === 'loading'

  return (
    <div className="px-2.5 pb-2">
      <div className="flex items-start py-1.5" aria-label="知识库统计">
        <SidebarMetric value={statistics?.documentCount} label="文档" loading={loading} />
        <div className="flex h-9 w-4 shrink-0 items-center justify-center" aria-hidden>
          <div className="bg-border h-6 w-px rotate-[15deg]" />
        </div>
        <SidebarMetric value={statistics?.relatedAppCount} label="个关联应用" loading={loading} />
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild disabled={!knowledgeBaseId}>
          <button
            type="button"
            className="border-border/70 hover:bg-muted focus-visible:bg-muted aria-expanded:bg-muted text-foreground flex h-8 w-full cursor-pointer items-center gap-1.5 rounded-lg border bg-transparent px-2.5 text-left text-[13px] font-medium outline-hidden transition-colors disabled:cursor-not-allowed disabled:opacity-50"
            aria-label="访问知识库 API"
            disabled={!knowledgeBaseId}
          >
            <Network aria-hidden className="text-muted-foreground size-3.5 shrink-0" />
            <span className="min-w-0 flex-1 truncate">访问 API</span>
            <span
              className="border-success/40 bg-success/40 size-2 shrink-0 rounded-[3px] border shadow-xs"
              role="status"
              aria-label="API 已启用"
            />
          </button>
        </DropdownMenuTrigger>

        <DropdownMenuContent
          side="top"
          align="start"
          sideOffset={8}
          className="w-(--radix-dropdown-menu-trigger-width) overflow-hidden p-0"
        >
          <div className="space-y-1.5 px-3 py-2.5" role="status">
            <div className="flex items-center justify-between gap-3">
              <div className="text-success flex items-center gap-1.5 text-[13px] font-semibold">
                <span
                  className="border-success/40 bg-success/40 size-2 rounded-[3px] border shadow-xs"
                  aria-hidden
                />
                <span>已启用</span>
              </div>
              <span
                className="bg-primary flex h-4 w-7 items-center justify-end rounded-full p-px shadow-xs"
                aria-hidden
              >
                <span className="bg-background size-3.5 rounded-full" />
              </span>
            </div>
            <p className="text-muted-foreground text-xs leading-4">此知识库可通过服务 API 访问</p>
          </div>

          <DropdownMenuSeparator className="m-0" />
          <DropdownMenuItem asChild className="rounded-none px-3 py-2 text-[13px]">
            <Link to="/docs/ai-workflow/rag-api" target="_blank" rel="noreferrer">
              <BookOpenText aria-hidden className="size-3.5" />
              <span className="min-w-0 flex-1 truncate">查阅 API 文档</span>
              <ExternalLink aria-hidden className="text-muted-foreground size-3.5" />
            </Link>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
