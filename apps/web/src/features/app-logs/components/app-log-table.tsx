import type {
  StudioWorkflowRunListItemDto,
  StudioWorkflowRunStatus,
  StudioWorkflowRunTrigger,
} from '@/api/studio'
import { UserAvatar } from '@/components/user-avatar'
import { Button } from '@ai-workflow/ui/components/button'
import { Skeleton } from '@ai-workflow/ui/components/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@ai-workflow/ui/components/table'
import { cn } from '@ai-workflow/ui/lib/utils'
import { useVirtualizer } from '@tanstack/react-virtual'
import { Braces, LoaderCircle, Network } from 'lucide-react'
import { useEffect, useRef, type ReactNode } from 'react'

const ROW_HEIGHT = 52
const COLUMN_COUNT = 5

interface AppLogTableProps {
  runs: StudioWorkflowRunListItemDto[]
  hasMore: boolean
  initialError: boolean
  initialLoading: boolean
  loadMoreError: boolean
  loadingMore: boolean
  onLoadMore: () => void
  onRetryInitial: () => void
  onRetryLoadMore: () => void
  onSelectRun: (run: StudioWorkflowRunListItemDto) => void
}

const RUN_STATUS_PRESENTATIONS: Record<
  StudioWorkflowRunStatus,
  { indicatorClassName: string; label: string; textClassName: string }
> = {
  QUEUED: {
    label: 'Queued',
    textClassName: 'text-warning',
    indicatorClassName: 'border-warning/40 bg-warning/40',
  },
  RUNNING: {
    label: 'Running',
    textClassName: 'text-primary',
    indicatorClassName: 'border-primary/40 bg-primary/40',
  },
  SUCCEEDED: {
    label: 'Success',
    textClassName: 'text-success',
    indicatorClassName: 'border-success/40 bg-success/40',
  },
  FAILED: {
    label: 'Failed',
    textClassName: 'text-destructive',
    indicatorClassName: 'border-destructive/40 bg-destructive/40',
  },
  CANCELLED: {
    label: 'Cancelled',
    textClassName: 'text-muted-foreground',
    indicatorClassName: 'border-muted-foreground/40 bg-muted-foreground/30',
  },
  TIMED_OUT: {
    label: 'Timed out',
    textClassName: 'text-destructive',
    indicatorClassName: 'border-destructive/40 bg-destructive/40',
  },
}

const RUN_TRIGGER_PRESENTATIONS: Record<
  Extract<StudioWorkflowRunTrigger, 'API' | 'SUB_WORKFLOW'>,
  { className: string; icon: typeof Braces; label: string }
> = {
  API: {
    className: 'bg-primary/10 text-primary',
    icon: Braces,
    label: 'API 调用',
  },
  SUB_WORKFLOW: {
    className: 'border-border/60 bg-primary/10 text-primary border-[0.5px] shadow-xs',
    icon: Network,
    label: '子工作流调用',
  },
}

export function AppLogTable({
  runs,
  hasMore,
  initialError,
  initialLoading,
  loadMoreError,
  loadingMore,
  onLoadMore,
  onRetryInitial,
  onRetryLoadMore,
  onSelectRun,
}: AppLogTableProps) {
  const scrollElementRef = useRef<HTMLDivElement>(null)
  const rowVirtualizer = useVirtualizer({
    count: runs.length,
    getScrollElement: () => scrollElementRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 8,
  })
  const virtualRows = rowVirtualizer.getVirtualItems()
  const lastVirtualRowIndex = virtualRows.at(-1)?.index

  useEffect(() => {
    if (
      lastVirtualRowIndex === undefined ||
      runs.length === 0 ||
      lastVirtualRowIndex < runs.length - 1 ||
      !hasMore ||
      loadingMore ||
      loadMoreError
    ) {
      return
    }

    onLoadMore()
  }, [hasMore, lastVirtualRowIndex, loadMoreError, loadingMore, onLoadMore, runs.length])

  const topSpacerHeight = virtualRows.at(0)?.start ?? 0
  const bottomSpacerHeight = virtualRows.length
    ? rowVirtualizer.getTotalSize() - (virtualRows.at(-1)?.end ?? 0)
    : 0

  return (
    <div ref={scrollElementRef} className="min-h-0 flex-1 overflow-auto">
      <Table
        aria-label="已发布工作流调用日志"
        aria-busy={initialLoading || loadingMore}
        containerClassName="overflow-visible"
        className="min-w-[820px] table-fixed"
      >
        <TableHeader className="bg-input sticky top-0 z-10 [&_tr]:border-0">
          <TableRow className="bg-input hover:bg-input border-0">
            <TableHead className="text-muted-foreground w-[230px] rounded-l-lg">开始时间</TableHead>
            <TableHead className="text-muted-foreground w-[130px]">状态</TableHead>
            <TableHead className="text-muted-foreground w-[140px]">运行时间</TableHead>
            <TableHead className="text-muted-foreground">用户</TableHead>
            <TableHead className="text-muted-foreground w-[180px] rounded-r-lg">触发方式</TableHead>
          </TableRow>
        </TableHeader>

        {initialLoading ? (
          <LoadingTableBody />
        ) : initialError ? (
          <MessageTableBody>
            <p className="text-muted-foreground text-sm">日志加载失败</p>
            <Button type="button" variant="secondary" size="sm" onClick={onRetryInitial}>
              重新加载
            </Button>
          </MessageTableBody>
        ) : runs.length === 0 ? (
          <MessageTableBody>
            <div>
              <p className="text-foreground text-sm font-medium">暂无调用日志</p>
              <p className="text-muted-foreground mt-1 text-xs">
                发布后的 API 或子工作流调用记录会显示在这里。
              </p>
            </div>
          </MessageTableBody>
        ) : (
          <TableBody>
            {topSpacerHeight > 0 ? <SpacerRow height={topSpacerHeight} /> : null}
            {virtualRows.map((virtualRow) => {
              const run = runs[virtualRow.index]
              if (!run) return null

              return <AppLogRow key={run.id} run={run} onSelectRun={onSelectRun} />
            })}
            {bottomSpacerHeight > 0 ? <SpacerRow height={bottomSpacerHeight} /> : null}
            {loadingMore ? (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={COLUMN_COUNT} className="h-13 text-center">
                  <span role="status" className="inline-flex items-center gap-2 text-sm">
                    <LoaderCircle
                      aria-hidden
                      className="text-primary size-4 animate-spin motion-reduce:animate-none"
                    />
                    <span className="text-muted-foreground">正在加载更多</span>
                  </span>
                </TableCell>
              </TableRow>
            ) : loadMoreError ? (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={COLUMN_COUNT} className="h-13 text-center">
                  <Button type="button" variant="secondary" size="sm" onClick={onRetryLoadMore}>
                    加载失败，点击重试
                  </Button>
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        )}
      </Table>
    </div>
  )
}

function AppLogRow({
  run,
  onSelectRun,
}: {
  run: StudioWorkflowRunListItemDto
  onSelectRun: (run: StudioWorkflowRunListItemDto) => void
}) {
  const username = getRunUsername(run)

  return (
    <TableRow
      className="hover:bg-input/50 h-[52px] cursor-pointer"
      onClick={() => onSelectRun(run)}
    >
      <TableCell className="text-foreground tabular-nums">{formatStartTime(run)}</TableCell>
      <TableCell>
        <RunStatus status={run.status} />
      </TableCell>
      <TableCell className="text-foreground tabular-nums">
        {formatRunDuration(run.durationMs)}
      </TableCell>
      <TableCell>
        <span className="flex min-w-0 items-center gap-2">
          <UserAvatar username={username} className="size-7" />
          <span className="min-w-0 truncate text-[13px]">{username}</span>
        </span>
      </TableCell>
      <TableCell>
        <RunTrigger trigger={run.trigger} />
      </TableCell>
    </TableRow>
  )
}

function RunStatus({ status }: { status: StudioWorkflowRunStatus }) {
  const presentation = RUN_STATUS_PRESENTATIONS[status]

  return (
    <span className="inline-flex items-center gap-1.5 text-xs leading-4 font-semibold whitespace-nowrap uppercase">
      <span
        aria-hidden
        className={cn(
          'block size-2 shrink-0 rounded-[3px] border border-solid shadow-xs',
          presentation.indicatorClassName,
          status === 'RUNNING' && 'animate-pulse motion-reduce:animate-none',
        )}
      />
      <span className={presentation.textClassName}>{presentation.label}</span>
    </span>
  )
}

function RunTrigger({ trigger }: { trigger: StudioWorkflowRunTrigger }) {
  const presentation =
    trigger === 'API' || trigger === 'SUB_WORKFLOW'
      ? RUN_TRIGGER_PRESENTATIONS[trigger]
      : {
          className: 'bg-muted text-muted-foreground',
          icon: Network,
          label: trigger,
        }
  const Icon = presentation.icon

  return (
    <span className="inline-flex items-center gap-2">
      <span
        className={cn(
          'flex size-8 shrink-0 items-center justify-center rounded-lg',
          presentation.className,
        )}
      >
        <Icon aria-hidden className="size-4" />
      </span>
      <span>{presentation.label}</span>
    </span>
  )
}

function LoadingTableBody() {
  return (
    <TableBody aria-label="正在加载调用日志">
      {Array.from({ length: 6 }, (_, index) => (
        <TableRow key={index} className="h-[52px] hover:bg-transparent">
          <TableCell>
            <Skeleton className="h-3.5 w-36" />
          </TableCell>
          <TableCell>
            <Skeleton className="h-3.5 w-16" />
          </TableCell>
          <TableCell>
            <Skeleton className="h-3.5 w-14" />
          </TableCell>
          <TableCell>
            <div className="flex items-center gap-2">
              <Skeleton className="size-7 rounded-full" />
              <Skeleton className="h-3.5 w-24" />
            </div>
          </TableCell>
          <TableCell>
            <Skeleton className="h-7 w-28" />
          </TableCell>
        </TableRow>
      ))}
    </TableBody>
  )
}

function MessageTableBody({ children }: { children: ReactNode }) {
  return (
    <TableBody>
      <TableRow className="border-0 hover:bg-transparent">
        <TableCell colSpan={COLUMN_COUNT} className="h-64 text-center whitespace-normal">
          <div className="flex flex-col items-center justify-center gap-3">{children}</div>
        </TableCell>
      </TableRow>
    </TableBody>
  )
}

function SpacerRow({ height }: { height: number }) {
  return (
    <tr aria-hidden style={{ height }}>
      <td colSpan={COLUMN_COUNT} />
    </tr>
  )
}

function getRunUsername(run: StudioWorkflowRunListItemDto): string {
  if (run.triggeredBy?.username) return run.triggeredBy.username
  if (run.trigger === 'API') return 'API 调用'
  if (run.trigger === 'SUB_WORKFLOW') return '上游工作流'
  return '系统'
}

function formatStartTime(run: StudioWorkflowRunListItemDto): string {
  if (!run.startedAt) return '—'

  const date = new Date(run.startedAt)
  if (Number.isNaN(date.getTime())) return run.startedAt

  return `${date.getFullYear()}-${padTimePart(date.getMonth() + 1)}-${padTimePart(date.getDate())} ${padTimePart(date.getHours())}:${padTimePart(date.getMinutes())}:${padTimePart(date.getSeconds())}`
}

function padTimePart(value: number): string {
  return value.toString().padStart(2, '0')
}

function formatRunDuration(durationMs?: number): string {
  if (durationMs === undefined) return '—'
  if (durationMs < 1000) return `${durationMs} ms`
  return `${(durationMs / 1000).toFixed(3).replace(/0+$/, '').replace(/\.$/, '')} s`
}
