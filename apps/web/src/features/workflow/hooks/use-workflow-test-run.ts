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
      input: Record<string, unknown>
      snapshot: WorkflowEditorSnapshot
    }
  | {
      mode: 'SINGLE_NODE'
      targetNodeId: string
      input?: Record<string, unknown>
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
  const [runResult, setRunResult] = useState<StudioWorkflowTestRunDto>()
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
      setRunResult(undefined)
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
            setRunResult(event.data)
          }
          if (event.event === 'node_finished') {
            setRunResult((current) => {
              if (current?.id !== event.data.runId) return current
              const traceNodeIds = event.data.traceNodeIds ?? current.traceNodeIds

              return {
                ...current,
                nodeRuns: event.data.nodeRuns ?? current.nodeRuns,
                nodeStates: event.data.nodeStates,
                loopIterations: event.data.loopIterations,
                traceNodeDurations: event.data.traceNodeDurations ?? current.traceNodeDurations,
                traceExecutions: event.data.traceExecutions,
                ...(traceNodeIds
                  ? {
                      traceNodeIds: reconcileTraceNodeIds(traceNodeIds, event.data.node.nodeId),
                    }
                  : {}),
              }
            })
          }
          if (event.event === 'workflow_finished') {
            runState.result = event.data
            setRunResult(event.data)
          }
        }

        try {
          await streamStudioWorkflowTestRun(
            appId,
            {
              mode: request.mode,
              ...(request.mode === 'SINGLE_NODE'
                ? {
                    targetNodeId: request.targetNodeId,
                    ...(request.input ? { input: request.input } : {}),
                  }
                : { input: request.input }),
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

        const terminalResult = runState.result ?? pausedResultRef.current
        if (!terminalResult) {
          clearRunningNodeStates(setNodeExecutionStatuses)
          if (runState.error instanceof Error) throw runState.error
          throw new Error('运行事件流在工作流结束前已断开')
        }

        if (terminalResult.status === 'CANCELLED' && pauseRequestedRef.current) {
          return terminalResult
        }

        if (terminalResult.status !== 'SUCCEEDED') {
          throw new Error(
            terminalResult.error?.message ?? getTerminalErrorMessage(terminalResult.status),
          )
        }

        return terminalResult
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
      const pausedResult = await cancelStudioWorkflowTestRun(appId, runId)
      if (abortControllerRef.current !== abortController) return
      if (pausedResult.status !== 'CANCELLED') {
        pauseRequestedRef.current = false
        return
      }

      pausedResultRef.current = pausedResult
      setRunResult(pausedResult)
      applyNodeStates(pausedResult.nodeStates, setNodeExecutionStatuses)
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
    result: runResult,
    run,
  }
}

function reconcileTraceNodeIds(snapshotNodeIds: readonly string[], eventNodeId: string): string[] {
  if (snapshotNodeIds.includes(eventNodeId)) return [...snapshotNodeIds]
  return [...snapshotNodeIds, eventNodeId]
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
