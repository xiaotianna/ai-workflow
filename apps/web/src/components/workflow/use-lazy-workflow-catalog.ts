import { useCallback, useEffect, useState } from 'react'

interface CatalogState<TItem> {
  items: readonly TItem[]
  status: 'idle' | 'loading' | 'success' | 'error'
}

export function useLazyWorkflowCatalog<TItem>(
  loadItems: (signal: AbortSignal) => Promise<readonly TItem[]>,
  enabled = true,
) {
  const [requested, setRequested] = useState(false)
  const [reloadRevision, setReloadRevision] = useState(0)
  const [state, setState] = useState<CatalogState<TItem>>({
    items: [],
    status: 'idle',
  })

  useEffect(() => {
    if (!enabled || !requested) return

    const controller = new AbortController()

    setState((currentState) => ({
      ...currentState,
      status: 'loading',
    }))

    void loadItems(controller.signal)
      .then((items) => {
        if (controller.signal.aborted) return

        setState({
          items,
          status: 'success',
        })
      })
      .catch(() => {
        if (controller.signal.aborted) return

        setState((currentState) => ({
          ...currentState,
          status: 'error',
        }))
      })

    return () => controller.abort()
  }, [enabled, loadItems, reloadRevision, requested])

  const load = useCallback(() => {
    setRequested(true)
  }, [])

  const reload = useCallback(() => {
    setRequested(true)
    setReloadRevision((revision) => revision + 1)
  }, [])

  return {
    items: state.items,
    load,
    loadError: state.status === 'error',
    loaded: state.status === 'success',
    loading: state.status === 'loading',
    reload,
  }
}
