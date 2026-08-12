import {
  BuiltinNodeType,
  type WorkflowEdge,
  type WorkflowEnvironmentVariable,
} from '@ai-workflow/core'
import type { Dispatch, SetStateAction } from 'react'
import { useRef, useState } from 'react'

import type { WorkflowCanvasNode } from '@/components/workflow/types'

const MAX_HISTORY_LENGTH = 100

interface WorkflowHistorySnapshot {
  nodes: WorkflowCanvasNode[]
  edges: WorkflowEdge[]
  environmentVariables: WorkflowEnvironmentVariable[]
}

interface HistoryStatus {
  canUndo: boolean
  canRedo: boolean
}

interface CheckpointOptions {
  continuing?: boolean
  completed?: boolean
}

interface UseWorkflowHistoryOptions {
  nodes: readonly WorkflowCanvasNode[]
  edges: readonly WorkflowEdge[]
  environmentVariables: readonly WorkflowEnvironmentVariable[]
  setNodes: Dispatch<SetStateAction<WorkflowCanvasNode[]>>
  setEdges: Dispatch<SetStateAction<WorkflowEdge[]>>
  setEnvironmentVariables: Dispatch<SetStateAction<WorkflowEnvironmentVariable[]>>
  onRestore?: (snapshot: WorkflowHistorySnapshot, matchesSavedState: boolean) => void
}

function getNodeSize(node: WorkflowCanvasNode) {
  if (node.type !== BuiltinNodeType.LOOP) return undefined

  const styleWidth = typeof node.style?.width === 'number' ? node.style.width : undefined,
    styleHeight = typeof node.style?.height === 'number' ? node.style.height : undefined,
    width = node.measured?.width ?? styleWidth,
    height = node.measured?.height ?? styleHeight

  return width && height ? { width, height } : undefined
}

function getPersistentSignature(snapshot: WorkflowHistorySnapshot) {
  return JSON.stringify({
    nodes: snapshot.nodes.map((node) => ({
      id: node.id,
      type: node.type,
      parentId: node.parentId,
      position: node.position,
      data: node.data,
      size: getNodeSize(node),
    })),
    edges: snapshot.edges.map(({ id, source, sourceHandle, target, targetHandle }) => ({
      id,
      source,
      sourceHandle,
      target,
      targetHandle,
    })),
    environmentVariables: snapshot.environmentVariables,
  })
}

function limitStack(stack: WorkflowHistorySnapshot[]) {
  if (stack.length > MAX_HISTORY_LENGTH) {
    stack.splice(0, stack.length - MAX_HISTORY_LENGTH)
  }
}

/**
 * 维护画布可持久化状态的撤销/重做栈。
 * 连续拖动或缩放通过 checkpoint 的 continuing/completed 合并为单次历史操作。
 */
export function useWorkflowHistory({
  edges,
  environmentVariables,
  nodes,
  onRestore,
  setEdges,
  setEnvironmentVariables,
  setNodes,
}: UseWorkflowHistoryOptions) {
  const nodesRef = useRef(nodes),
    edgesRef = useRef(edges),
    environmentVariablesRef = useRef(environmentVariables),
    pastRef = useRef<WorkflowHistorySnapshot[]>([]),
    futureRef = useRef<WorkflowHistorySnapshot[]>([]),
    transactionActiveRef = useRef(false),
    savedSignatureRef = useRef<string | undefined>(undefined),
    [status, setStatus] = useState<HistoryStatus>({
      canUndo: false,
      canRedo: false,
    })

  nodesRef.current = nodes
  edgesRef.current = edges
  environmentVariablesRef.current = environmentVariables

  function createSnapshot(): WorkflowHistorySnapshot {
    return {
      nodes: [...nodesRef.current],
      edges: [...edgesRef.current],
      environmentVariables: [...environmentVariablesRef.current],
    }
  }

  if (savedSignatureRef.current === undefined) {
    savedSignatureRef.current = getPersistentSignature(createSnapshot())
  }

  function updateStatus() {
    setStatus({
      canUndo: pastRef.current.length > 0,
      canRedo: futureRef.current.length > 0,
    })
  }

  function pushCurrentToPast() {
    const snapshot = createSnapshot(),
      lastSnapshot = pastRef.current.at(-1)

    if (lastSnapshot && getPersistentSignature(lastSnapshot) === getPersistentSignature(snapshot)) {
      futureRef.current = []
      updateStatus()
      return
    }

    pastRef.current.push(snapshot)
    limitStack(pastRef.current)
    futureRef.current = []
    updateStatus()
  }

  function checkpoint({ completed = false, continuing = false }: CheckpointOptions = {}) {
    if (!transactionActiveRef.current) {
      pushCurrentToPast()
    }

    if (continuing) {
      transactionActiveRef.current = true
    } else if (completed) {
      transactionActiveRef.current = false
    }
  }

  function restore(snapshot: WorkflowHistorySnapshot) {
    const restoredSnapshot = {
      nodes: [...snapshot.nodes],
      edges: [...snapshot.edges],
      environmentVariables: [...snapshot.environmentVariables],
    }

    nodesRef.current = restoredSnapshot.nodes
    edgesRef.current = restoredSnapshot.edges
    environmentVariablesRef.current = restoredSnapshot.environmentVariables
    setNodes(restoredSnapshot.nodes)
    setEdges(restoredSnapshot.edges)
    setEnvironmentVariables(restoredSnapshot.environmentVariables)
    onRestore?.(
      restoredSnapshot,
      getPersistentSignature(restoredSnapshot) === savedSignatureRef.current,
    )
  }

  function undo() {
    transactionActiveRef.current = false
    const snapshot = pastRef.current.pop()
    if (!snapshot) return

    futureRef.current.push(createSnapshot())
    limitStack(futureRef.current)
    restore(snapshot)
    updateStatus()
  }

  function redo() {
    transactionActiveRef.current = false
    const snapshot = futureRef.current.pop()
    if (!snapshot) return

    pastRef.current.push(createSnapshot())
    limitStack(pastRef.current)
    restore(snapshot)
    updateStatus()
  }

  function markSaved() {
    savedSignatureRef.current = getPersistentSignature(createSnapshot())
  }

  return {
    ...status,
    checkpoint,
    markSaved,
    redo,
    undo,
  }
}
