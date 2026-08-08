import { listPlugins, type PluginListItemDto, type PluginListScope } from '@/api/plugins'
import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'

import { toPluginListItem } from '../data'
import type { PluginFilterId } from '../constants'
import type { PluginListItem } from '../types'

const pluginSearchDebounce = 300
const pluginPageSize = 24
const scopeByFilter: Record<PluginFilterId, PluginListScope> = {
  all: 'ALL',
  installed: 'INSTALLED',
  used: 'USED',
  mine: 'MINE',
}

export function usePlugins() {
  const [searchParams] = useSearchParams()
  const initialSearch = searchParams.get('query')?.trim() ?? ''
  const [plugins, setPlugins] = useState<PluginListItem[]>([])
  const [search, setSearch] = useState(initialSearch)
  const [debouncedSearch, setDebouncedSearch] = useState(initialSearch)
  const [activeFilter, setActiveFilter] = useState<PluginFilterId>('all')
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [initialized, setInitialized] = useState(false)
  const [initialLoading, setInitialLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [initialError, setInitialError] = useState(false)
  const [loadMoreError, setLoadMoreError] = useState(false)
  const [refreshRevision, setRefreshRevision] = useState(0)
  const queryVersionRef = useRef(0)
  const loadMoreControllerRef = useRef<AbortController | undefined>(undefined)
  const loadingMoreRef = useRef(false)

  useEffect(() => {
    const timeout = globalThis.setTimeout(() => {
      setDebouncedSearch(search.trim())
    }, pluginSearchDebounce)

    return () => globalThis.clearTimeout(timeout)
  }, [search])

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
    setPlugins([])
    setNextCursor(null)
    setInitialLoading(true)
    setLoadingMore(false)
    setInitialError(false)
    setLoadMoreError(false)

    void listPlugins(
      {
        limit: pluginPageSize,
        search: debouncedSearch || undefined,
        scope: scopeByFilter[activeFilter],
      },
      controller.signal,
    )
      .then((result) => {
        if (queryVersionRef.current !== queryVersion) return

        setPlugins(result.items.map(toPluginListItem))
        setNextCursor(result.nextCursor)
      })
      .catch(() => {
        if (controller.signal.aborted || queryVersionRef.current !== queryVersion) return
        setInitialError(true)
      })
      .finally(() => {
        if (queryVersionRef.current === queryVersion) {
          setInitialLoading(false)
          setInitialized(true)
        }
      })

    return () => controller.abort()
  }, [activeFilter, debouncedSearch, refreshRevision])

  async function requestMore(cursor: string) {
    if (loadingMoreRef.current) return

    const queryVersion = queryVersionRef.current
    const controller = new AbortController()

    loadMoreControllerRef.current?.abort()
    loadMoreControllerRef.current = controller
    loadingMoreRef.current = true
    setLoadingMore(true)

    try {
      const result = await listPlugins(
        {
          cursor,
          limit: pluginPageSize,
          search: debouncedSearch || undefined,
          scope: scopeByFilter[activeFilter],
        },
        controller.signal,
      )

      if (queryVersionRef.current !== queryVersion) return

      setPlugins((currentPlugins) => mergePlugins(currentPlugins, result.items))
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

  return {
    hasMore: nextCursor !== null,
    activeFilter,
    heroLoading: !initialized,
    initialError,
    initialLoading,
    loadMore,
    loadMoreError,
    loadingMore,
    plugins,
    refresh: () => setRefreshRevision((revision) => revision + 1),
    retryLoadMore,
    search,
    setSearch,
    setActiveFilter,
  }
}

function mergePlugins(
  currentPlugins: PluginListItem[],
  nextPlugins: PluginListItemDto[],
): PluginListItem[] {
  const mergedPlugins = [...currentPlugins]
  const existingPluginKeys = new Set(currentPlugins.map((plugin) => plugin.id))

  for (const plugin of nextPlugins) {
    if (existingPluginKeys.has(plugin.id)) continue
    existingPluginKeys.add(plugin.id)
    mergedPlugins.push(toPluginListItem(plugin))
  }

  return mergedPlugins
}
