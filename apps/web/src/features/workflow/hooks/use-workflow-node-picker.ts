import type { XYPosition } from '@xyflow/react'
import { type RefObject, useState } from 'react'

import type { useWorkflowEditor } from './use-workflow-editor'

type WorkflowEditor = ReturnType<typeof useWorkflowEditor>

type NodePickerState =
  | { kind: 'closed'; anchorPosition?: XYPosition }
  | { kind: 'add'; center?: XYPosition; anchorPosition?: XYPosition }
  | {
      kind: 'insert-edge'
      edgeId: string
      center: XYPosition
      anchorPosition: XYPosition
    }
  | {
      kind: 'connect-next'
      sourceNodeId: string
      sourceHandle?: string
      anchor: HTMLButtonElement
      anchorPosition?: undefined
    }
  | {
      kind: 'replace'
      nodeId: string
      sourceNodeId?: string
      sourceHandle?: string
      anchorPosition?: XYPosition
    }

interface UseWorkflowNodePickerOptions {
  defaultAnchorRef: RefObject<HTMLButtonElement | null>
  editor: WorkflowEditor
}

export function useWorkflowNodePicker({ defaultAnchorRef, editor }: UseWorkflowNodePickerOptions) {
  const [state, setState] = useState<NodePickerState>({ kind: 'closed' })
  const open = state.kind !== 'closed'
  const connectionSourceNodeId = state.kind === 'connect-next' ? state.sourceNodeId : undefined
  const connectionSourceHandle = state.kind === 'connect-next' ? state.sourceHandle : undefined
  const anchor = state.kind === 'connect-next' ? state.anchor : defaultAnchorRef.current
  const anchorPosition = state.anchorPosition
  const popoverAlign: 'start' | 'end' =
    state.kind === 'connect-next' || anchorPosition ? 'start' : 'end'
  const popoverSide: 'top' | 'right' | 'left' =
    state.kind === 'connect-next' ? 'left' : anchorPosition ? 'right' : 'top'
  const replaceNodeId = state.kind === 'replace' ? state.nodeId : undefined
  const nodeTypes = replaceNodeId
    ? editor.getReplacementNodeTypes(replaceNodeId)
    : connectionSourceNodeId
      ? editor.getNextNodeTypes(connectionSourceNodeId)
      : editor.availableNodeTypes
  const disabledNodeTypes = replaceNodeId
    ? state.kind === 'replace' && state.sourceNodeId
      ? editor.getConnectedReplacementDisabledNodeTypes(replaceNodeId)
      : editor.getReplacementDisabledNodeTypes(replaceNodeId)
    : state.kind === 'insert-edge'
      ? editor.edgeInsertionDisabledNodeTypes
      : connectionSourceNodeId
        ? editor.getNextDisabledNodeTypes(connectionSourceNodeId, connectionSourceHandle)
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

  function openConnectNextNode(
    sourceNodeId: string,
    nextAnchor: HTMLButtonElement,
    sourceHandle?: string,
  ) {
    setState({
      kind: 'connect-next',
      sourceNodeId,
      ...(sourceHandle ? { sourceHandle } : {}),
      anchor: nextAnchor,
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

  function openReplaceConnectedNode(
    sourceNodeId: string,
    nodeId: string,
    nextAnchorPosition?: XYPosition,
    sourceHandle?: string,
  ) {
    if (!editor.canReplaceConnectedNode(sourceNodeId, nodeId, sourceHandle)) return false

    setState({
      kind: 'replace',
      sourceNodeId,
      ...(sourceHandle ? { sourceHandle } : {}),
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
    if (state.kind === 'connect-next') {
      editor.addConnectedNode(type, state.sourceNodeId, state.sourceHandle)
      return
    }

    if (state.kind === 'replace') {
      const replaced = state.sourceNodeId
        ? editor.replaceConnectedNode(state.sourceNodeId, state.nodeId, type, state.sourceHandle)
        : editor.replaceNode(state.nodeId, type)

      if (!replaced) throw new Error(state.sourceNodeId ? '已连接节点更改失败' : '节点更换失败')
      return
    }

    if (state.kind === 'insert-edge') {
      editor.insertNodeOnEdge(type, state.edgeId, state.center)
      return
    }

    editor.addNode(type, state.kind === 'add' ? state.center : undefined)
  }

  return {
    anchor,
    anchorPosition,
    close,
    connectionSourceNodeId,
    connectionSourceHandle,
    disabledNodeTypes,
    handleOpenChange,
    handleSelectNode,
    nodeTypes,
    open,
    openAddNode,
    openConnectNextNode,
    openInsertNode,
    openReplaceConnectedNode,
    openReplaceNode,
    operationLabel:
      state.kind === 'replace'
        ? state.sourceNodeId
          ? '更改'
          : '更换'
        : state.kind === 'connect-next'
          ? '添加并连接'
          : '添加',
    popoverAlign,
    popoverSide,
  }
}
