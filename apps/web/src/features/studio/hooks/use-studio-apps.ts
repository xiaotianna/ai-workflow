import { listStudioApps, type StudioAppDto, type StudioAppSort } from '@/api/studio'
import { useEffect, useRef, useState } from 'react'

import { toStudioAppListItem } from '../data'
import type { StudioAppListItem } from '../types'

const studioAppPageSize = 24,
  studioSearchDebounce = 300

export function useStudioApps() {
  const [apps, setApps] = useState<StudioAppListItem[]>([]),
    [search, setSearch] = useState(''),
    [debouncedSearch, setDebouncedSearch] = useState(''),
    [sort, setSort] = useState<StudioAppSort>('updated_desc'),
    [nextCursor, setNextCursor] = useState<string | null>(null),
    [initialLoading, setInitialLoading] = useState(true),
    [loadingMore, setLoadingMore] = useState(false),
    [initialError, setInitialError] = useState(false),
    [loadMoreError, setLoadMoreError] = useState(false),
    [refreshRevision, setRefreshRevision] = useState(0),
    queryVersionRef = useRef(0),
    loadMoreControllerRef = useRef<AbortController | undefined>(undefined),
    loadingMoreRef = useRef(false)

  useEffect(() => {
    const timeout = globalThis.setTimeout(() => {
      setDebouncedSearch(search.trim())
    }, studioSearchDebounce)

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
      controller = new AbortController()

    queryVersionRef.current = queryVersion
    loadMoreControllerRef.current?.abort()
    loadingMoreRef.current = false
    setApps([])
    setNextCursor(null)
    setInitialLoading(true)
    setLoadingMore(false)
    setInitialError(false)
    setLoadMoreError(false)

    void listStudioApps(
      {
        limit: studioAppPageSize,
        search: debouncedSearch || undefined,
        sort,
      },
      controller.signal,
    )
      .then((result) => {
        if (queryVersionRef.current !== queryVersion) return

        setApps(result.items.map(toStudioAppListItem))
        setNextCursor(result.nextCursor)
      })
      .catch(() => {
        if (controller.signal.aborted || queryVersionRef.current !== queryVersion) return
        setInitialError(true)
      })
      .finally(() => {
        if (queryVersionRef.current === queryVersion) {
          setInitialLoading(false)
        }
      })

    return () => controller.abort()
  }, [debouncedSearch, refreshRevision, sort])

  async function requestMore(cursor: string) {
    if (loadingMoreRef.current) return

    const queryVersion = queryVersionRef.current,
      controller = new AbortController()

    loadMoreControllerRef.current?.abort()
    loadMoreControllerRef.current = controller
    loadingMoreRef.current = true
    setLoadingMore(true)

    try {
      const result = await listStudioApps(
        {
          cursor,
          limit: studioAppPageSize,
          search: debouncedSearch || undefined,
          sort,
        },
        controller.signal,
      )

      if (queryVersionRef.current !== queryVersion) return

      setApps((currentApps) => mergeStudioApps(currentApps, result.items))
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
    setRefreshRevision((currentRevision) => currentRevision + 1)
  }

  return {
    apps,
    hasMore: nextCursor !== null,
    initialError,
    initialLoading,
    loadMore,
    loadMoreError,
    loadingMore,
    refresh,
    retryLoadMore,
    search,
    setSearch,
    setSort,
    sort,
  }
}

function mergeStudioApps(
  currentApps: StudioAppListItem[],
  nextApps: StudioAppDto[],
): StudioAppListItem[] {
  const mergedApps = [...currentApps],
    existingIds = new Set(currentApps.map((app) => app.id))

  for (const app of nextApps) {
    if (existingIds.has(app.id)) continue
    existingIds.add(app.id)
    mergedApps.push(toStudioAppListItem(app))
  }

  return mergedApps
}
