import type { XYPosition } from '@xyflow/react'
import { type RefObject, useState } from 'react'

import type { useWorkflowEditor } from './use-workflow-editor'

type WorkflowEditor = ReturnType<typeof useWorkflowEditor>

type NodePickerState =
  | { kind: 'closed'; anchorPosition?: XYPosition }
  | { kind: 'add'; center?: XYPosition; anchorPosition?: XYPosition }
  | { kind: 'insert-edge'; edgeId: string; center: XYPosition; anchorPosition: XYPosition }
  | { kind: 'replace'; nodeId: string; anchorPosition?: XYPosition }

interface UseWorkflowNodePickerOptions {
  defaultAnchorRef: RefObject<HTMLButtonElement | null>
  editor: WorkflowEditor
}

export function useWorkflowNodePicker({ defaultAnchorRef, editor }: UseWorkflowNodePickerOptions) {
  const [state, setState] = useState<NodePickerState>({ kind: 'closed' })
  const open = state.kind !== 'closed'
  const anchorPosition = state.anchorPosition
  const replaceNodeId = state.kind === 'replace' ? state.nodeId : undefined
  const nodeTypes = replaceNodeId
    ? editor.getReplacementNodeTypes(replaceNodeId)
    : editor.availableNodeTypes
  const disabledNodeTypes = replaceNodeId
    ? editor.getReplacementDisabledNodeTypes(replaceNodeId)
    : state.kind === 'insert-edge'
      ? editor.edgeInsertionDisabledNodeTypes
      : editor.disabledNodeTypes

  function openAddNode(center?: XYPosition, nextAnchorPosition?: XYPosition) {
    setState({
      kind: 'add',
      ...(center ? { center } : {}),
      ...(nextAnchorPosition ? { anchorPosition: nextAnchorPosition } : {}),
    })
  }

  function openInsertNode(edgeId: string, center: XYPosition, nextAnchorPosition: XYPosition) {
    setState({
      kind: 'insert-edge',
      edgeId,
      center,
      anchorPosition: nextAnchorPosition,
    })
  }

  function openReplaceNode(nodeId: string, nextAnchorPosition?: XYPosition) {
    if (!editor.canReplaceNode(nodeId)) return false

    setState({
      kind: 'replace',
      nodeId,
      ...(nextAnchorPosition ? { anchorPosition: nextAnchorPosition } : {}),
    })
    return true
  }

  function close() {
    setState((currentState) =>
      currentState.kind === 'closed'
        ? currentState
        : {
            kind: 'closed',
            ...(currentState.anchorPosition ? { anchorPosition: currentState.anchorPosition } : {}),
          },
    )
  }

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) {
      close()
      return
    }

    if (state.kind === 'closed') {
      openAddNode()
    }
  }

  function handleSelectNode(type: string) {
    if (state.kind === 'replace') {
      if (!editor.replaceNode(state.nodeId, type)) {
        throw new Error('节点更换失败')
      }
      return
    }

    if (state.kind === 'insert-edge') {
      editor.insertNodeOnEdge(type, state.edgeId, state.center)
      return
    }

    editor.addNode(type, state.kind === 'add' ? state.center : undefined)
  }

  return {
    anchor: defaultAnchorRef.current,
    anchorPosition,
    close,
    disabledNodeTypes,
    handleOpenChange,
    handleSelectNode,
    nodeTypes,
    open,
    openAddNode,
    openInsertNode,
    openReplaceNode,
    operationLabel: state.kind === 'replace' ? '更换' : '添加',
  }
}
