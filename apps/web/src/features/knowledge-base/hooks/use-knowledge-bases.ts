import { listKnowledgeBases, type KnowledgeBaseSort } from '@/api/knowledge-bases'
import { useEffect, useState } from 'react'

import { toKnowledgeBaseListItem } from '../data'
import type { KnowledgeBaseListItem } from '../types'

const knowledgeBaseSearchDebounce = 300

export function useKnowledgeBases() {
  const [knowledgeBases, setKnowledgeBases] = useState<KnowledgeBaseListItem[]>([]),
    [search, setSearch] = useState(''),
    [debouncedSearch, setDebouncedSearch] = useState(''),
    [sort, setSort] = useState<KnowledgeBaseSort>('updated_desc'),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(false),
    [refreshRevision, setRefreshRevision] = useState(0)

  useEffect(() => {
    const timeout = globalThis.setTimeout(() => {
      setDebouncedSearch(search.trim())
    }, knowledgeBaseSearchDebounce)

    return () => globalThis.clearTimeout(timeout)
  }, [search])

  useEffect(() => {
    const controller = new AbortController()

    setLoading(true)
    setError(false)

    void listKnowledgeBases(
      {
        search: debouncedSearch || undefined,
        sort,
      },
      controller.signal,
    )
      .then(({ items }) => {
        setKnowledgeBases(items.map(toKnowledgeBaseListItem))
      })
      .catch(() => {
        if (!controller.signal.aborted) setError(true)
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })

    return () => controller.abort()
  }, [debouncedSearch, refreshRevision, sort])

  return {
    error,
    knowledgeBases,
    loading,
    refresh: () => setRefreshRevision((revision) => revision + 1),
    search,
    setSearch,
    setSort,
    sort,
  }
}
