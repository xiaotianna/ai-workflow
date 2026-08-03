import {
  cancelStudioWorkflowTestRun,
  resumeStudioWorkflowTestRun,
  streamStudioWorkflowTestRun,
  type StudioWorkflowNodeExecutionStateDto,
  type StudioWorkflowNodeExecutionStatus,
  type StudioWorkflowTestRunSseEvent,
  type StudioWorkflowTestRunDto,
} from '@/api/studio'
import type { WorkflowEditorSnapshot } from '@/components/workflow/types'
import { useCallback, useEffect, useRef, useState } from 'react'

export type WorkflowNodeExecutionStatuses = Readonly<
  Record<string, StudioWorkflowNodeExecutionStatus>
>

export type WorkflowTestRunRequest =
  | {
      mode: 'FULL'
      snapshot: WorkflowEditorSnapshot
    }
  | {
      mode: 'SINGLE_NODE'
      targetNodeId: string
      snapshot: WorkflowEditorSnapshot
    }

export type WorkflowTestRunResult = StudioWorkflowTestRunDto

export function useWorkflowTestRun(appId: string) {
  const inFlightRef = useRef(false)
  const abortControllerRef = useRef<AbortController | undefined>(undefined)
  const activeRunIdRef = useRef<string | undefined>(undefined)
  const pauseInFlightRef = useRef(false)
  const pauseRequestedRef = useRef(false)
  const pausedResultRef = useRef<StudioWorkflowTestRunDto | undefined>(undefined)
  const [activeRunId, setActiveRunId] = useState<string>()
  const [pending, setPending] = useState(false)
  const [pausing, setPausing] = useState(false)
  const [nodeExecutionStatuses, setNodeExecutionStatuses] = useState<WorkflowNodeExecutionStatuses>(
    {},
  )

  useEffect(
    () => () => {
      abortControllerRef.current?.abort()
    },
    [appId],
  )

  const run = useCallback(
    async (request: WorkflowTestRunRequest): Promise<StudioWorkflowTestRunDto> => {
      if (inFlightRef.current) {
        throw new Error('已有测试运行正在进行，请稍候')
      }

      inFlightRef.current = true
      pauseRequestedRef.current = false
      pausedResultRef.current = undefined
      activeRunIdRef.current = undefined
      setActiveRunId(undefined)
      setPending(true)
      setNodeExecutionStatuses({})
      const abortController = new AbortController()
      abortControllerRef.current = abortController

      try {
        const runState: {
          error?: unknown
          id?: string
          result?: StudioWorkflowTestRunDto
        } = {}
        const handleEvent = (event: StudioWorkflowTestRunSseEvent) => {
          applyNodeStates(event.data.nodeStates, setNodeExecutionStatuses)
          if (event.event === 'workflow_started') {
            runState.id = event.data.id
            activeRunIdRef.current = event.data.id
            setActiveRunId(event.data.id)
          }
          if (event.event === 'workflow_finished') runState.result = event.data
        }

        try {
          await streamStudioWorkflowTestRun(
            appId,
            {
              mode: request.mode,
              ...(request.mode === 'SINGLE_NODE'
                ? { targetNodeId: request.targetNodeId }
                : { input: {} }),
              definition: request.snapshot.workflow,
              layout: request.snapshot.layout,
            },
            handleEvent,
            abortController.signal,
          )
        } catch (error) {
          runState.error = error
        }

        if (!runState.result && !abortController.signal.aborted && runState.id) {
          runState.error = undefined
          try {
            await resumeStudioWorkflowTestRun(
              appId,
              runState.id,
              handleEvent,
              abortController.signal,
            )
          } catch (error) {
            runState.error = error
          }
        }

        const result = runState.result ?? pausedResultRef.current
        if (!result) {
          clearRunningNodeStates(setNodeExecutionStatuses)
          if (runState.error instanceof Error) throw runState.error
          throw new Error('运行事件流在工作流结束前已断开')
        }

        if (result.status === 'CANCELLED' && pauseRequestedRef.current) return result

        if (result.status !== 'SUCCEEDED') {
          throw new Error(result.error?.message ?? getTerminalErrorMessage(result.status))
        }

        return result
      } finally {
        if (abortControllerRef.current === abortController) {
          abortControllerRef.current = undefined
        }
        activeRunIdRef.current = undefined
        pauseRequestedRef.current = false
        pausedResultRef.current = undefined
        setActiveRunId(undefined)
        setPausing(false)
        inFlightRef.current = false
        setPending(false)
      }
    },
    [appId],
  )

  const pause = useCallback(async (): Promise<void> => {
    const runId = activeRunIdRef.current
    const abortController = abortControllerRef.current
    if (!inFlightRef.current || !runId || !abortController || pauseInFlightRef.current) return

    pauseInFlightRef.current = true
    pauseRequestedRef.current = true
    setPausing(true)

    try {
      const result = await cancelStudioWorkflowTestRun(appId, runId)
      if (abortControllerRef.current !== abortController) return
      if (result.status !== 'CANCELLED') {
        pauseRequestedRef.current = false
        return
      }

      pausedResultRef.current = result
      applyNodeStates(result.nodeStates, setNodeExecutionStatuses)
      abortController.abort()
    } catch (error) {
      if (abortControllerRef.current === abortController) pauseRequestedRef.current = false
      throw error
    } finally {
      pauseInFlightRef.current = false
      if (abortControllerRef.current === abortController) setPausing(false)
    }
  }, [appId])

  return {
    canPause: pending && Boolean(activeRunId) && !pausing,
    nodeExecutionStatuses,
    pause,
    pausing,
    pending,
    run,
  }
}

function applyNodeStates(
  nodeStates: readonly StudioWorkflowNodeExecutionStateDto[],
  setNodeExecutionStatuses: (
    update: (current: WorkflowNodeExecutionStatuses) => WorkflowNodeExecutionStatuses,
  ) => void,
): void {
  setNodeExecutionStatuses(() => {
    const next: Record<string, StudioWorkflowNodeExecutionStatus> = {}
    for (const nodeState of nodeStates) next[nodeState.nodeId] = nodeState.status
    return next
  })
}

function clearRunningNodeStates(
  setNodeExecutionStatuses: (
    update: (current: WorkflowNodeExecutionStatuses) => WorkflowNodeExecutionStatuses,
  ) => void,
): void {
  setNodeExecutionStatuses((current) =>
    Object.fromEntries(Object.entries(current).filter(([, status]) => status !== 'RUNNING')),
  )
}

function getTerminalErrorMessage(status: string) {
  switch (status) {
    case 'CANCELLED': {
      return '测试运行已取消'
    }
    case 'TIMED_OUT': {
      return '测试运行已超时'
    }
    default: {
      return '测试运行失败'
    }
  }
}
