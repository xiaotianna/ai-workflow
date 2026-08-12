import {
  getStudioWorkflowRun,
  type StudioWorkflowRunDetailDto,
  type StudioWorkflowRunListItemDto,
} from '@/api/studio'
import { Button } from '@ai-workflow/ui/components/button'
import { Skeleton } from '@ai-workflow/ui/components/skeleton'
import { ArrowLeft, LoaderCircle } from 'lucide-react'
import { useEffect, useState } from 'react'

import { useWorkflowRunHistory } from '../hooks/use-workflow-run-history'
import {
  getWorkflowRunStatusLabel,
  getWorkflowRunTriggerLabel,
  WorkflowRunStatusIcon,
  WorkflowRunTabs,
} from './workflow-run-tabs'

interface WorkflowRunHistoryPanelProps {
  appId: string
  refreshKey?: string
}

export function WorkflowRunHistoryPanel({ appId, refreshKey }: WorkflowRunHistoryPanelProps) {
  const history = useWorkflowRunHistory(appId, refreshKey),
    [selectedRun, setSelectedRun] = useState<StudioWorkflowRunListItemDto>(),
    [detail, setDetail] = useState<StudioWorkflowRunDetailDto>(),
    [detailLoading, setDetailLoading] = useState(false),
    [detailError, setDetailError] = useState(false),
    [detailRequestRevision, setDetailRequestRevision] = useState(0)

  useEffect(() => {
    if (!selectedRun) return

    const controller = new AbortController()
    setDetail(undefined)
    setDetailLoading(true)
    setDetailError(false)

    void getStudioWorkflowRun(appId, selectedRun.id, controller.signal)
      .then(setDetail)
      .catch(() => {
        if (!controller.signal.aborted) setDetailError(true)
      })
      .finally(() => {
        if (!controller.signal.aborted) setDetailLoading(false)
      })

    return () => controller.abort()
  }, [appId, detailRequestRevision, refreshKey, selectedRun])

  if (selectedRun) {
    return (
      <div className="flex h-full min-h-0 flex-col">
        <div className="border-border flex h-10 shrink-0 items-center gap-1 border-b-[0.5px] px-2">
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            className="text-muted-foreground"
            aria-label="返回运行历史列表"
            onClick={() => setSelectedRun(undefined)}
          >
            <ArrowLeft className="size-4" aria-hidden />
          </Button>
          <p className="text-foreground min-w-0 truncate text-[13px] font-medium">
            {getWorkflowRunTitle(selectedRun)}
          </p>
        </div>

        {detailLoading ? (
          <RunDetailLoadingState />
        ) : detailError ? (
          <RequestErrorState
            message="运行详情加载失败"
            onRetry={() => setDetailRequestRevision((current) => current + 1)}
          />
        ) : detail ? (
          <WorkflowRunTabs ariaLabel="运行详情内容" nodes={detail.definition.nodes} run={detail} />
        ) : null}
      </div>
    )
  }

  if (history.initialLoading) return <RunListLoadingState />

  if (history.initialError) {
    return <RequestErrorState message="运行历史加载失败" onRetry={history.refresh} />
  }

  if (history.runs.length === 0) {
    return (
      <div className="flex h-full min-h-52 items-center justify-center px-6 py-10 text-center">
        <p className="text-muted-foreground text-sm">暂无运行记录</p>
      </div>
    )
  }

  return (
    <div className="h-full min-h-0 overflow-y-auto px-2 py-2">
      <ul className="space-y-0.5">
        {history.runs.map((run) => (
          <li key={run.id}>
            <button
              type="button"
              className="hover:bg-muted/70 focus-visible:bg-muted/70 flex w-full cursor-pointer items-start gap-2.5 rounded-xl px-2.5 py-2 text-left transition-colors outline-none"
              aria-label={`${getWorkflowRunTitle(run)}，${getWorkflowRunStatusLabel(run.status)}，查看详情`}
              onClick={() => setSelectedRun(run)}
            >
              <span className="mt-0.5 flex size-4 shrink-0 items-center justify-center">
                <WorkflowRunStatusIcon status={run.status} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="text-foreground block truncate text-sm leading-5 font-semibold">
                  {getWorkflowRunTitle(run)}
                </span>
                <span className="text-muted-foreground mt-0.5 block truncate text-[13px] leading-5">
                  {getWorkflowRunAuthor(run)} · {formatRelativeTime(run.queuedAt)}
                </span>
              </span>
            </button>
          </li>
        ))}
      </ul>

      {history.loadingMore ? (
        <div role="status" className="flex h-12 items-center justify-center">
          <LoaderCircle
            className="text-primary size-4 animate-spin motion-reduce:animate-none"
            aria-label="正在加载更多运行记录"
          />
        </div>
      ) : history.loadMoreError ? (
        <div className="flex h-12 items-center justify-center">
          <Button type="button" variant="secondary" size="sm" onClick={history.retryLoadMore}>
            加载失败，点击重试
          </Button>
        </div>
      ) : history.hasMore ? (
        <div className="flex h-12 items-center justify-center">
          <Button type="button" variant="ghost" size="sm" onClick={history.loadMore}>
            加载更多
          </Button>
        </div>
      ) : null}
    </div>
  )
}

function RunListLoadingState() {
  return (
    <div role="status" aria-label="正在加载运行历史" className="space-y-1 px-2 py-2">
      {Array.from({ length: 6 }, (_, index) => (
        <div key={index} className="flex items-start gap-2.5 rounded-xl px-2.5 py-2">
          <Skeleton className="mt-0.5 size-4 shrink-0 rounded-full" />
          <div className="min-w-0 flex-1 space-y-1.5">
            <Skeleton className="h-4 w-3/5 rounded-sm" />
            <Skeleton className="h-3.5 w-2/5 rounded-sm" />
          </div>
        </div>
      ))}
    </div>
  )
}

function RunDetailLoadingState() {
  return (
    <div role="status" aria-label="正在加载运行详情" className="space-y-3 px-4 py-3">
      <Skeleton className="h-8 w-full rounded-lg" />
      <Skeleton className="h-44 w-full rounded-lg" />
      <Skeleton className="h-32 w-full rounded-lg" />
    </div>
  )
}

function RequestErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex min-h-52 flex-1 flex-col items-center justify-center gap-3 px-6 py-10 text-center">
      <p className="text-muted-foreground text-sm">{message}</p>
      <Button type="button" variant="secondary" size="sm" onClick={onRetry}>
        重新加载
      </Button>
    </div>
  )
}

function getWorkflowRunTitle(run: StudioWorkflowRunListItemDto): string {
  return `${getWorkflowRunTriggerLabel(run.trigger)} (${formatClockTime(run.queuedAt)})`
}

function getWorkflowRunAuthor(run: StudioWorkflowRunListItemDto): string {
  return run.triggeredBy?.username ?? (run.trigger === 'API' ? 'API' : '系统')
}

function formatClockTime(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '--:--:--'

  return new Intl.DateTimeFormat('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(date)
}

function formatRelativeTime(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value

  const differenceMs = Math.max(0, Date.now() - date.getTime()),
    differenceMinutes = Math.floor(differenceMs / 60_000)
  if (differenceMinutes < 1) return '刚刚'
  if (differenceMinutes < 60) return `${differenceMinutes} 分钟前`

  const differenceHours = Math.floor(differenceMinutes / 60)
  if (differenceHours < 24) return `${differenceHours} 小时前`

  const differenceDays = Math.floor(differenceHours / 24)
  if (differenceDays < 7) return `${differenceDays} 天前`

  return new Intl.DateTimeFormat('zh-CN', {
    month: '2-digit',
    day: '2-digit',
  }).format(date)
}
