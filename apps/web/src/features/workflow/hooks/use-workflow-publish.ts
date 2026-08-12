import {
  getStudioWorkflowDeployment,
  publishStudioWorkflow,
  type StudioWorkflowDeploymentDto,
} from '@/api/studio'
import type { WorkflowEditorSnapshot } from '@/components/workflow/types'
import { useEffect, useRef, useState } from 'react'

export function useWorkflowPublish(appId: string) {
  const publishInFlightRef = useRef(false),
    [deployment, setDeployment] = useState<StudioWorkflowDeploymentDto | null>(),
    [loadError, setLoadError] = useState(false),
    [loading, setLoading] = useState(true),
    [pending, setPending] = useState(false)

  useEffect(() => {
    const controller = new AbortController()
    setDeployment(undefined)
    setLoadError(false)
    setLoading(true)

    void getStudioWorkflowDeployment(appId, controller.signal)
      .then(setDeployment)
      .catch(() => {
        if (!controller.signal.aborted) setLoadError(true)
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })

    return () => controller.abort()
  }, [appId])

  async function publish(snapshot: WorkflowEditorSnapshot): Promise<StudioWorkflowDeploymentDto> {
    if (publishInFlightRef.current) {
      throw new Error('工作流正在发布，请稍候')
    }

    publishInFlightRef.current = true
    setPending(true)

    try {
      const nextDeployment = await publishStudioWorkflow(appId, {
        definition: snapshot.workflow,
        layout: snapshot.layout,
      })
      setDeployment(nextDeployment)
      return nextDeployment
    } finally {
      publishInFlightRef.current = false
      setPending(false)
    }
  }

  return {
    deployment,
    loadError,
    loading,
    pending,
    publish,
  }
}
