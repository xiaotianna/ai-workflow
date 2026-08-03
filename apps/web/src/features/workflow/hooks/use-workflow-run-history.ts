import { listStudioWorkflowRuns, type StudioWorkflowRunListItemDto } from '@/api/studio'
import { useEffect, useRef, useState } from 'react'

const workflowRunPageSize = 20

export function useWorkflowRunHistory(appId: string, refreshKey?: string) {
  const [runs, setRuns] = useState<StudioWorkflowRunListItemDto[]>([])
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [initialLoading, setInitialLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [initialError, setInitialError] = useState(false)
  const [loadMoreError, setLoadMoreError] = useState(false)
  const [refreshRevision, setRefreshRevision] = useState(0)
  const queryVersionRef = useRef(0)
  const loadMoreControllerRef = useRef<AbortController | undefined>(undefined)
  const loadingMoreRef = useRef(false)

  useEffect(
    () => () => {
      loadMoreControllerRef.current?.abort()
    },
    [],
  )

  useEffect(() => {
    const queryVersion = queryVersionRef.current + 1
    const controller = new AbortController()

    queryVersionRef.current = queryVersion
    loadMoreControllerRef.current?.abort()
    loadingMoreRef.current = false
    setRuns([])
    setNextCursor(null)
    setInitialLoading(true)
    setLoadingMore(false)
    setInitialError(false)
    setLoadMoreError(false)

    void listStudioWorkflowRuns(appId, { limit: workflowRunPageSize }, controller.signal)
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
  }, [appId, refreshKey, refreshRevision])

  async function requestMore(cursor: string) {
    if (loadingMoreRef.current) return

    const queryVersion = queryVersionRef.current
    const controller = new AbortController()
    loadMoreControllerRef.current?.abort()
    loadMoreControllerRef.current = controller
    loadingMoreRef.current = true
    setLoadingMore(true)

    try {
      const result = await listStudioWorkflowRuns(
        appId,
        { cursor, limit: workflowRunPageSize },
        controller.signal,
      )
      if (queryVersionRef.current !== queryVersion) return

      setRuns((currentRuns) => mergeWorkflowRuns(currentRuns, result.items))
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

  function refresh() {
    setRefreshRevision((current) => current + 1)
  }

  return {
    hasMore: nextCursor !== null,
    initialError,
    initialLoading,
    loadMore,
    loadMoreError,
    loadingMore,
    refresh,
    retryLoadMore,
    runs,
  }
}

function mergeWorkflowRuns(
  currentRuns: StudioWorkflowRunListItemDto[],
  nextRuns: StudioWorkflowRunListItemDto[],
): StudioWorkflowRunListItemDto[] {
  const mergedRuns = [...currentRuns]
  const existingIds = new Set(currentRuns.map((run) => run.id))

  for (const run of nextRuns) {
    if (existingIds.has(run.id)) continue
    existingIds.add(run.id)
    mergedRuns.push(run)
  }

  return mergedRuns
}
