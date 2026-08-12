import { getStudioWorkflowNodeLastRun, type StudioWorkflowNodeLastRunDto } from '@/api/studio'
import { useEffect, useState } from 'react'

export function useWorkflowNodeLastRun(
  appId: string | undefined,
  nodeId: string | undefined,
  enabled: boolean,
  refreshKey?: number,
) {
  const [lastRun, setLastRun] = useState<StudioWorkflowNodeLastRunDto | null>(),
    [loading, setLoading] = useState(false),
    [error, setError] = useState(false)

  useEffect(() => {
    if (!enabled || !appId || !nodeId) {
      setLastRun(undefined)
      setLoading(false)
      setError(false)
      return
    }

    const controller = new AbortController()
    setLoading(true)
    setError(false)

    void getStudioWorkflowNodeLastRun(appId, nodeId, controller.signal)
      .then((result) => {
        setLastRun(result)
      })
      .catch(() => {
        if (!controller.signal.aborted) setError(true)
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })

    return () => controller.abort()
  }, [appId, enabled, nodeId, refreshKey])

  return {
    error,
    lastRun,
    loading,
    reload: () => {
      if (!appId || !nodeId) return
      setLoading(true)
      setError(false)
      void getStudioWorkflowNodeLastRun(appId, nodeId)
        .then((result) => setLastRun(result))
        .catch(() => setError(true))
        .finally(() => setLoading(false))
    },
  }
}
