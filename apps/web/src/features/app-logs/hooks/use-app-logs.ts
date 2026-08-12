import {
  listStudioWorkflowRuns,
  type ListStudioWorkflowRunsParams,
  type StudioWorkflowRunListItemDto,
  type StudioWorkflowRunStatus,
} from '@/api/studio'
import { useEffect, useRef, useState } from 'react'

import { getAppLogRangeStart, type AppLogDateRange } from '../data'

const APP_LOG_PAGE_SIZE = 30,
  SEARCH_DEBOUNCE_MS = 300

interface UseAppLogsOptions {
  appId: string
  dateRange: AppLogDateRange
  search: string
  status?: StudioWorkflowRunStatus
}

export function useAppLogs({ appId, dateRange, search, status }: UseAppLogsOptions) {
  const [runs, setRuns] = useState<StudioWorkflowRunListItemDto[]>([]),
    [nextCursor, setNextCursor] = useState<string | null>(null),
    [initialLoading, setInitialLoading] = useState(true),
    [loadingMore, setLoadingMore] = useState(false),
    [initialError, setInitialError] = useState(false),
    [loadMoreError, setLoadMoreError] = useState(false),
    [refreshRevision, setRefreshRevision] = useState(0),
    [debouncedSearch, setDebouncedSearch] = useState(search),
    queryVersionRef = useRef(0),
    loadingMoreRef = useRef(false),
    loadMoreControllerRef = useRef<AbortController | undefined>(undefined),
    queryParamsRef = useRef<ListStudioWorkflowRunsParams | undefined>(undefined)

  useEffect(() => {
    const timeout = globalThis.setTimeout(
      () => setDebouncedSearch(search.trim()),
      SEARCH_DEBOUNCE_MS,
    )
    return () => globalThis.clearTimeout(timeout)
  }, [search])

  useEffect(
    () => () => {
      loadMoreControllerRef.current?.abort()
    },
    [],
  )

  useEffect(() => {
    const queryVersion = queryVersionRef.current + 1,
      controller = new AbortController(),
      from = getAppLogRangeStart(dateRange),
      params: ListStudioWorkflowRunsParams = {
        limit: APP_LOG_PAGE_SIZE,
        scope: 'published_calls',
        ...(status ? { status } : {}),
        ...(from ? { from } : {}),
        ...(debouncedSearch ? { search: debouncedSearch } : {}),
      }

    queryVersionRef.current = queryVersion
    queryParamsRef.current = params
    loadMoreControllerRef.current?.abort()
    loadingMoreRef.current = false
    setRuns([])
    setNextCursor(null)
    setInitialLoading(true)
    setLoadingMore(false)
    setInitialError(false)
    setLoadMoreError(false)

    void listStudioWorkflowRuns(appId, params, controller.signal)
      .then((result) => {
        if (queryVersionRef.current !== queryVersion) return
        setRuns(result.items)
        setNextCursor(result.nextCursor)
      })
      .catch(() => {
        if (controller.signal.aborted || queryVersionRef.current !== queryVersion) return
        setInitialError(true)
      })
      .finally(() => {
        if (queryVersionRef.current === queryVersion) setInitialLoading(false)
      })

    return () => controller.abort()
  }, [appId, dateRange, debouncedSearch, refreshRevision, status])

  async function requestMore(cursor: string) {
    if (loadingMoreRef.current) return

    const queryVersion = queryVersionRef.current,
      params = queryParamsRef.current
    if (!params) return

    const controller = new AbortController()
    loadMoreControllerRef.current?.abort()
    loadMoreControllerRef.current = controller
    loadingMoreRef.current = true
    setLoadingMore(true)

    try {
      const result = await listStudioWorkflowRuns(appId, { ...params, cursor }, controller.signal)
      if (queryVersionRef.current !== queryVersion) return

      setRuns((currentRuns) => mergeAppLogRuns(currentRuns, result.items))
      setNextCursor(result.nextCursor)
      setLoadMoreError(false)
    } catch {
      if (!controller.signal.aborted && queryVersionRef.current === queryVersion) {
        setLoadMoreError(true)
      }
    } finally {
      if (queryVersionRef.current === queryVersion) {
        loadingMoreRef.current = false
        setLoadingMore(false)
      }
    }
  }

  function loadMore() {
    if (!nextCursor || loadMoreError) return
    void requestMore(nextCursor)
  }

  function retryLoadMore() {
    if (!nextCursor) return
    setLoadMoreError(false)
    void requestMore(nextCursor)
  }

  function retryInitial() {
    setRefreshRevision((current) => current + 1)
  }

  return {
    hasMore: nextCursor !== null,
    initialError,
    initialLoading,
    loadMore,
    loadMoreError,
    loadingMore,
    retryInitial,
    retryLoadMore,
    runs,
  }
}

function mergeAppLogRuns(
  currentRuns: StudioWorkflowRunListItemDto[],
  nextRuns: StudioWorkflowRunListItemDto[],
): StudioWorkflowRunListItemDto[] {
  const mergedRuns = [...currentRuns],
    existingIds = new Set(currentRuns.map((run) => run.id))

  for (const run of nextRuns) {
    if (existingIds.has(run.id)) continue
    existingIds.add(run.id)
    mergedRuns.push(run)
  }

  return mergedRuns
}
