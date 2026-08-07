import type { WorkflowEditorSnapshot } from '@/components/workflow/types'
import { validateWorkflow, workflowSchema, type NodeRegistryReader } from '@ai-workflow/core'
import { useEffect, useRef, useState } from 'react'

const AUTO_SAVE_DEBOUNCE_MS = 800

export type WorkflowSaveStatus = 'saved' | 'pending' | 'saving' | 'error'

interface UseWorkflowSaveOptions {
  snapshot: WorkflowEditorSnapshot
  dirty: boolean
  initialSavedAt?: Date
  onSave: (snapshot: WorkflowEditorSnapshot) => void | Promise<void>
  onSaved: () => void
  nodeRegistry: NodeRegistryReader
}

function getSnapshotSignature(snapshot: WorkflowEditorSnapshot) {
  return JSON.stringify(snapshot)
}

/**
 * 编排工作流自动保存。
 * 是否发生持久化修改由 useWorkflowEditor 的 dirty 状态决定；本 Hook 只负责防抖、校验和请求排队。
 */
export function useWorkflowSave({
  dirty,
  initialSavedAt,
  onSave,
  onSaved,
  snapshot,
  nodeRegistry,
}: UseWorkflowSaveOptions) {
  const signature = getSnapshotSignature(snapshot)
  const [errors, setErrors] = useState<string[]>([])
  const [lastSavedAt, setLastSavedAt] = useState<Date | undefined>(initialSavedAt)
  const [pending, setPending] = useState(false)
  const [status, setStatus] = useState<WorkflowSaveStatus>('saved')
  const debounceElapsedRef = useRef(false)
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const inFlightSignatureRef = useRef<string | undefined>(undefined)
  const latestSignatureRef = useRef(signature)
  const latestSnapshotRef = useRef(snapshot)
  const mountedRef = useRef(true)
  const onSaveRef = useRef(onSave)
  const onSavedRef = useRef(onSaved)
  const savedSignatureRef = useRef(signature)
  const savingRef = useRef(false)

  latestSignatureRef.current = signature
  latestSnapshotRef.current = snapshot
  onSaveRef.current = onSave
  onSavedRef.current = onSaved

  function clearDebounceTimer() {
    if (debounceTimerRef.current === undefined) return

    clearTimeout(debounceTimerRef.current)
    debounceTimerRef.current = undefined
  }

  async function saveLatest() {
    if (savingRef.current) return

    const savingSignature = latestSignatureRef.current
    if (savingSignature === savedSignatureRef.current) {
      if (mountedRef.current) {
        setPending(false)
        setStatus('saved')
      }
      return
    }

    const savingSnapshot = latestSnapshotRef.current
    const parsedWorkflow = workflowSchema.safeParse(savingSnapshot.workflow)

    if (!parsedWorkflow.success) {
      if (mountedRef.current) {
        setErrors(
          parsedWorkflow.error.issues.map(
            (issue) => `${issue.path.join('.') || 'workflow'}：${issue.message}`,
          ),
        )
        setPending(true)
        setStatus('error')
      }
      return
    }

    const validationIssues = validateWorkflow(parsedWorkflow.data, nodeRegistry)
    if (validationIssues.length > 0) {
      if (mountedRef.current) {
        setErrors(validationIssues.map((issue) => issue.message))
        setPending(true)
        setStatus('error')
      }
      return
    }

    const validatedSnapshot = {
      workflow: parsedWorkflow.data,
      layout: savingSnapshot.layout,
    } satisfies WorkflowEditorSnapshot

    debounceElapsedRef.current = false
    inFlightSignatureRef.current = savingSignature
    savingRef.current = true

    if (mountedRef.current) {
      setErrors([])
      setPending(true)
      setStatus('saving')
    }

    try {
      await onSaveRef.current(validatedSnapshot)
      savedSignatureRef.current = savingSignature

      const latestWasSaved = latestSignatureRef.current === savingSignature
      if (latestWasSaved) {
        onSavedRef.current()
      }

      if (mountedRef.current) {
        setLastSavedAt(new Date())
        setPending(!latestWasSaved)
        setStatus(latestWasSaved ? 'saved' : 'pending')
      }
    } catch (error) {
      if (mountedRef.current) {
        setErrors([error instanceof Error ? error.message : '保存工作流失败'])
        setPending(true)
        setStatus('error')
      }
    } finally {
      inFlightSignatureRef.current = undefined
      savingRef.current = false

      if (
        mountedRef.current &&
        debounceElapsedRef.current &&
        latestSignatureRef.current !== savedSignatureRef.current
      ) {
        void saveLatest()
      }
    }
  }

  useEffect(() => {
    clearDebounceTimer()

    const activeSignature = savingRef.current
      ? inFlightSignatureRef.current
      : savedSignatureRef.current
    const shouldQueueSave = signature !== activeSignature && (dirty || savingRef.current)

    if (!shouldQueueSave) {
      if (!savingRef.current && signature === savedSignatureRef.current) {
        setErrors([])
        setPending(false)
        setStatus('saved')
      }
      return
    }

    debounceElapsedRef.current = false
    setErrors([])
    setPending(true)
    if (!savingRef.current) {
      setStatus('pending')
    }

    debounceTimerRef.current = setTimeout(() => {
      debounceTimerRef.current = undefined
      debounceElapsedRef.current = true
      void saveLatest()
    }, AUTO_SAVE_DEBOUNCE_MS)

    return clearDebounceTimer
  }, [dirty, signature])

  useEffect(() => {
    mountedRef.current = true

    return () => {
      mountedRef.current = false
      clearDebounceTimer()
    }
  }, [])

  function saveNow() {
    clearDebounceTimer()
    debounceElapsedRef.current = true
    void saveLatest()
  }

  return {
    errors,
    hasPendingSave:
      pending || savingRef.current || (dirty && signature !== savedSignatureRef.current),
    lastSavedAt,
    saveNow,
    status,
  }
}
