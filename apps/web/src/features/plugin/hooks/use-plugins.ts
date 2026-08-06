import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'

import type { PluginCategoryId } from '../constants'
import { filterMockPlugins } from '../data'
import type { PluginListItem } from '../types'

const pluginSearchDebounce = 300
const mockLoadingDelay = 900

export function usePlugins() {
  const [searchParams] = useSearchParams()
  const initialSearch = searchParams.get('query')?.trim() ?? ''
  const [plugins, setPlugins] = useState<PluginListItem[]>([])
  const [search, setSearch] = useState(initialSearch)
  const [debouncedSearch, setDebouncedSearch] = useState(initialSearch)
  const [categoryId, setCategoryId] = useState<PluginCategoryId>('all')
  const [loading, setLoading] = useState(true)
  const [initialLoading, setInitialLoading] = useState(true)
  const [error, setError] = useState(false)
  const [refreshRevision, setRefreshRevision] = useState(0)

  useEffect(() => {
    const timeout = globalThis.setTimeout(() => {
      setDebouncedSearch(search.trim())
    }, pluginSearchDebounce)

    return () => globalThis.clearTimeout(timeout)
  }, [search])

  useEffect(() => {
    const controller = new AbortController()

    setLoading(true)
    setError(false)

    const timeout = globalThis.setTimeout(() => {
      if (controller.signal.aborted) return

      try {
        setPlugins(filterMockPlugins(debouncedSearch, categoryId))
      } catch {
        setError(true)
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false)
          setInitialLoading(false)
        }
      }
    }, mockLoadingDelay)

    return () => {
      controller.abort()
      globalThis.clearTimeout(timeout)
    }
  }, [categoryId, debouncedSearch, refreshRevision])

  return {
    categoryId,
    error,
    initialLoading,
    loading,
    plugins,
    refresh: () => setRefreshRevision((revision) => revision + 1),
    search,
    setCategoryId,
    setSearch,
  }
}
