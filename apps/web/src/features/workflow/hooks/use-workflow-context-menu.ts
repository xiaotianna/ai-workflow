import type { WorkflowCanvasNode } from '@/components/workflow/types'
import type { WorkflowEdge } from '@ai-workflow/core'
import {
  useReactFlow,
  type EdgeMouseHandler,
  type NodeMouseHandler,
  type ReactFlowProps,
  type Viewport,
} from '@xyflow/react'
import { useState, useSyncExternalStore } from 'react'

import type { useWorkflowEditor } from './use-workflow-editor'
import type { useWorkflowNodePicker } from './use-workflow-node-picker'
import type { useWorkflowOperations } from './use-workflow-operations'
import type { WorkflowContextMenuActionStrategy } from '../workflow-context-menu-registry'
import { workflowContextMenuActionRegistry } from '../workflow-context-menu-strategies'

interface UseWorkflowContextMenuOptions {
  editor: ReturnType<typeof useWorkflowEditor>
  nodePicker: ReturnType<typeof useWorkflowNodePicker>
  operations: ReturnType<typeof useWorkflowOperations>
  disabled?: boolean
}

export function useWorkflowContextMenu({
  editor,
  nodePicker,
  operations,
  disabled = false,
}: UseWorkflowContextMenuOptions) {
  const { getViewport, screenToFlowPosition } = useReactFlow()
  const [open, setOpen] = useState(false)
  const [instanceKey, setInstanceKey] = useState(0)
  const [viewportBeforeRemount, setViewportBeforeRemount] = useState<Viewport>()
  const [target, setTarget] = useState<
    | {
        scope: 'canvas'
        position: { x: number; y: number }
        screenPosition: { x: number; y: number }
      }
    | { scope: 'node'; nodeId: string; screenPosition: { x: number; y: number } }
  >()

  useSyncExternalStore(
    workflowContextMenuActionRegistry.subscribe,
    workflowContextMenuActionRegistry.getSnapshot,
    workflowContextMenuActionRegistry.getSnapshot,
  )

  const context = target ? { target, editor, nodePicker, operations } : undefined
  const actions =
    context === undefined
      ? []
      : workflowContextMenuActionRegistry.resolve(context.target.scope, context)

  const handlePaneContextMenu: NonNullable<
    ReactFlowProps<WorkflowCanvasNode, WorkflowEdge>['onPaneContextMenu']
  > = (event) => {
    if (disabled) return

    setTarget({
      scope: 'canvas',
      position: screenToFlowPosition({ x: event.clientX, y: event.clientY }),
      screenPosition: { x: event.clientX, y: event.clientY },
    })
  }

  const handleEdgeContextMenu: EdgeMouseHandler<WorkflowEdge> = (event) => {
    if (disabled) return

    setTarget({
      scope: 'canvas',
      position: screenToFlowPosition({ x: event.clientX, y: event.clientY }),
      screenPosition: { x: event.clientX, y: event.clientY },
    })
  }

  const handleNodeContextMenu: NodeMouseHandler<WorkflowCanvasNode> = (event, node) => {
    if (disabled) return

    editor.selectNodeForContextMenu(node.id)
    setTarget({
      scope: 'node',
      nodeId: node.id,
      screenPosition: { x: event.clientX, y: event.clientY },
    })
  }

  function executeAction(
    action: WorkflowContextMenuActionStrategy,
    actionAnchorPosition?: { x: number; y: number },
  ) {
    if (!context) return

    const actionContext = actionAnchorPosition ? { ...context, actionAnchorPosition } : context
    if (action.isDisabled?.(actionContext)) return

    action.execute(actionContext)
  }

  function handleOpenChange(nextOpen: boolean) {
    setOpen(disabled ? false : nextOpen)
  }

  function close() {
    if (!open) return

    setViewportBeforeRemount(getViewport())
    setOpen(false)
    setInstanceKey((currentKey) => currentKey + 1)
  }

  return {
    actions,
    close,
    context,
    executeAction,
    handleEdgeContextMenu,
    handleNodeContextMenu,
    handleOpenChange,
    handlePaneContextMenu,
    instanceKey,
    open: disabled ? false : open,
    viewportBeforeRemount,
  }
}
