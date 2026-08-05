import {
  getStudioWorkflowRun,
  type StudioWorkflowRunDetailDto,
  type StudioWorkflowRunListItemDto,
} from '@/api/studio'
import { Tooltip } from '@/components/tooltip'
import { Button } from '@ai-workflow/ui/components/button'
import { LoaderCircle, Play, X } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useState } from 'react'

import { type AppLogDateRange, type AppLogStatusFilter } from '../data'
import { useAppLogs } from '../hooks/use-app-logs'
import { AppLogFilters } from './app-log-filters'
import { AppLogTable } from './app-log-table'
import { WorkflowRunTabs } from '@/features/workflow/components/workflow-run-tabs'
import { useWorkflowTestRun } from '@/features/workflow/hooks/use-workflow-test-run'

interface AppLogsProps {
  appId: string
}

export function AppLogs({ appId }: AppLogsProps) {
  const [status, setStatus] = useState<AppLogStatusFilter>('all')
  const [dateRange, setDateRange] = useState<AppLogDateRange>('7d')
  const [search, setSearch] = useState('')
  const selectedStatus = status === 'all' ? undefined : status
  const logs = useAppLogs({
    appId,
    dateRange,
    search,
    ...(selectedStatus ? { status: selectedStatus } : {}),
  })
  const [selectedRun, setSelectedRun] = useState<StudioWorkflowRunListItemDto>()
  const [detail, setDetail] = useState<StudioWorkflowRunDetailDto>()
  const [loadingDetail, setLoadingDetail] = useState(false)
  const testRun = useWorkflowTestRun(appId)

  useEffect(() => {
    if (!selectedRun) return
    const controller = new AbortController()
    setLoadingDetail(true)
    setDetail(undefined)
    void getStudioWorkflowRun(appId, selectedRun.id, controller.signal)
      .then(setDetail)
      .catch(() => {
        if (!controller.signal.aborted) setDetail(undefined)
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoadingDetail(false)
      })
    return () => controller.abort()
  }, [appId, selectedRun])

  function closeDetail() {
    setSelectedRun(undefined)
    setDetail(undefined)
  }

  return (
    <div className="relative flex h-full min-h-0 min-w-0 flex-col">
      <AppLogFilters
        dateRange={dateRange}
        search={search}
        status={status}
        onDateRangeChange={setDateRange}
        onSearchChange={setSearch}
        onStatusChange={setStatus}
      />

      <div className="mt-4 flex min-h-0 min-w-0 flex-1 flex-col">
        <AppLogTable
          runs={logs.runs}
          hasMore={logs.hasMore}
          initialError={logs.initialError}
          initialLoading={logs.initialLoading}
          loadMoreError={logs.loadMoreError}
          loadingMore={logs.loadingMore}
          onLoadMore={logs.loadMore}
          onRetryInitial={logs.retryInitial}
          onRetryLoadMore={logs.retryLoadMore}
          onSelectRun={setSelectedRun}
        />
      </div>

      <AnimatePresence>
        {selectedRun ? (
          <motion.div
            className="pointer-events-auto fixed inset-4 z-20"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            onClick={closeDetail}
          >
            <motion.aside
              className="bg-background border-border/60 absolute inset-y-0 right-0 flex w-[min(32rem,100%)] flex-col overflow-hidden rounded-2xl border shadow-lg"
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ duration: 0.22, ease: 'easeOut' }}
              onClick={(event) => event.stopPropagation()}
            >
              <header className="flex shrink-0 items-center gap-2 px-4 pt-5 pb-2">
                <h2 className="text-foreground min-w-0 truncate text-base font-semibold">
                  日志详情
                </h2>
                {detail ? (
                  <Tooltip content="按此参数运行" side="bottom">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-xs"
                      className="text-muted-foreground shrink-0"
                      aria-label="按此参数运行"
                      disabled={testRun.pending}
                      onClick={() => {
                        void testRun.run({
                          mode: 'FULL',
                          input: getBusinessInput(detail.input),
                          snapshot: {
                            workflow: detail.definition,
                            layout: detail.layout,
                          },
                        })
                      }}
                    >
                      <Play className="size-4" aria-hidden />
                    </Button>
                  </Tooltip>
                ) : null}
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  className="text-muted-foreground ml-auto shrink-0"
                  aria-label="关闭日志详情"
                  onClick={closeDetail}
                >
                  <X className="size-4" aria-hidden />
                </Button>
              </header>
              {loadingDetail ? (
                <div className="text-muted-foreground flex flex-1 items-center justify-center">
                  <LoaderCircle className="size-5 animate-spin" aria-label="正在加载日志详情" />
                </div>
              ) : detail ? (
                <WorkflowRunTabs
                  ariaLabel="日志运行结果"
                  nodes={detail.definition.nodes}
                  run={testRun.result ?? detail}
                />
              ) : null}
            </motion.aside>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  )
}

function getBusinessInput(input: unknown): Record<string, unknown> {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return {}

  return Object.fromEntries(Object.entries(input).filter(([key]) => !key.startsWith('sys.')))
}
