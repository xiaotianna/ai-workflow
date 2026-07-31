import type { WorkflowCanvasNode, WorkflowEditorSnapshot } from '@/components/workflow/types'
import { Background, ConnectionLineType, ReactFlow, ReactFlowProvider } from '@xyflow/react'
import { useWorkflowEditor } from '../hooks/use-workflow-editor'
import type { WorkflowEdge, WorkflowNode } from '@ai-workflow/core'
import { workflowNodeTypes } from '@/components/workflow/workflow-nodes'
import { WorkflowPanel } from './workflow-panel'
import { useEffect, useRef, useState } from 'react'
import '@xyflow/react/dist/style.css'
import { WorkflowLoopEditorProvider } from '@/components/workflow/workflow-loop-editor-context'
import { useWorkflowShortcuts } from '../hooks/use-workflow-shortcuts'
import { useWorkflowNodePicker } from '../hooks/use-workflow-node-picker'
import { useWorkflowOperations } from '../hooks/use-workflow-operations'
import { useWorkflowContextMenu } from '../hooks/use-workflow-context-menu'
import { useWorkflowNavigationGuard } from '../hooks/use-workflow-navigation-guard'
import { useWorkflowSave } from '../hooks/use-workflow-save'
import { WorkflowContextMenu } from './workflow-context-menu'
import { WorkflowSavePendingDialog } from './workflow-save-pending-dialog'
import { ImportDslDialog } from '@/features/studio'
import type { WorkflowApplicationMetadata } from '../utils/workflow-application-dsl'
import { NodeSelectorPopover } from '@ai-workflow/nodes-ui'
import { WorkflowAddNodeProvider } from '@/components/workflow/workflow-add-node-context'
import { workflowEdgeTypes } from '@/components/workflow/workflow-edge'

interface WorkflowEditorProps {
  applicationMetadata?: WorkflowApplicationMetadata
  initialSavedAt?: Date
  initialSnapshot: WorkflowEditorSnapshot
  disabled?: boolean
  onRunNode?: (node: WorkflowNode, snapshot: WorkflowEditorSnapshot) => unknown | Promise<unknown>
  onSave: (document: WorkflowEditorSnapshot) => void | Promise<void>
  onTestRun?: (snapshot: WorkflowEditorSnapshot) => unknown | Promise<unknown>
}

export function WorkflowEditor({
  applicationMetadata,
  initialSavedAt,
  initialSnapshot,
  disabled = false,
  onRunNode,
  onSave,
  onTestRun,
}: WorkflowEditorProps) {
  const canvasRef = useRef<HTMLDivElement>(null)
  const addNodeButtonRef = useRef<HTMLButtonElement>(null)
  const [hoveredNodeId, setHoveredNodeId] = useState<string>()
  const [shortcutHelpOpen, setShortcutHelpOpen] = useState(false)
  const editor = useWorkflowEditor({ canvasRef, initialSnapshot })
  const save = useWorkflowSave({
    dirty: editor.dirty,
    initialSavedAt,
    snapshot: editor.createSnapshot(),
    onSave,
    onSaved: editor.markSaved,
  })
  const navigationGuard = useWorkflowNavigationGuard(save.hasPendingSave)
  const nodePicker = useWorkflowNodePicker({
    defaultAnchorRef: addNodeButtonRef,
    editor,
  })
  const operations = useWorkflowOperations({
    applicationMetadata,
    editor,
    onRunNode,
    onTestRun,
  })
  const contextMenu = useWorkflowContextMenu({
    editor,
    nodePicker,
    operations,
    disabled,
  })

  function handleNodePickerOpenChange(nextOpen: boolean) {
    nodePicker.handleOpenChange(nextOpen)
    if (!nextOpen && contextMenu.open) {
      contextMenu.close()
    }
  }

  function handleNextStepOpenChange(
    sourceNodeId: string,
    nextOpen: boolean,
    trigger: HTMLButtonElement,
  ) {
    if (nextOpen) {
      nodePicker.openConnectNextNode(sourceNodeId, trigger)
      return
    }

    handleNodePickerOpenChange(false)
  }

  useEffect(() => {
    if (!disabled) return

    nodePicker.close()
    contextMenu.close()
    operations.setImportDialogOpen(false)
    setShortcutHelpOpen(false)
    editor.clearSelection()
  }, [disabled])

  useWorkflowShortcuts({
    editor,
    addNodeOpen: nodePicker.open,
    interactionBlocked: contextMenu.open || operations.importDialogOpen,
    shortcutHelpOpen,
    onAddNodeOpenChange: handleNodePickerOpenChange,
    onSave: save.saveNow,
    onShortcutHelpOpenChange: setShortcutHelpOpen,
    onTestRun: () => void operations.testRun(),
    disabled,
  })
  const renderedEdges = hoveredNodeId
    ? editor.edges.map((edge) =>
        edge.source === hoveredNodeId || edge.target === hoveredNodeId
          ? { ...edge, className: 'workflow-edge--node-hovered' }
          : edge,
      )
    : editor.edges

  return (
    <>
      <WorkflowSavePendingDialog
        open={navigationGuard.blocked}
        onLeave={navigationGuard.leave}
        onStay={navigationGuard.stay}
      />

      <ImportDslDialog
        open={disabled ? false : operations.importDialogOpen}
        title="导入应用"
        description="导入后将覆盖当前画布中的全部节点、连线和布局。此操作仍可通过撤销恢复，请确认后继续。"
        confirmLabel="确认导入"
        onImport={operations.importDsl}
        onOpenChange={operations.setImportDialogOpen}
      />

      <WorkflowLoopEditorProvider value={editor.loopEditor} disabled={disabled}>
        <WorkflowContextMenu
          actions={contextMenu.actions}
          context={contextMenu.context}
          disabled={disabled}
          instanceKey={contextMenu.instanceKey}
          keepOpen={nodePicker.open}
          onAction={contextMenu.executeAction}
          onOpenChange={contextMenu.handleOpenChange}
        >
          <WorkflowAddNodeProvider
            disabled={disabled}
            openInsertNode={(edgeId, center, anchorPosition) =>
              nodePicker.openInsertNode(edgeId, center, anchorPosition)
            }
          >
            <div className="h-full min-h-0 w-full">
              <ReactFlow<WorkflowCanvasNode, WorkflowEdge>
                ref={canvasRef}
                nodes={editor.nodes}
                edges={renderedEdges}
                nodeTypes={workflowNodeTypes}
                edgeTypes={workflowEdgeTypes}
                defaultEdgeOptions={{ type: ConnectionLineType.Bezier }}
                connectionLineType={ConnectionLineType.Bezier}
                proOptions={{ hideAttribution: true }}
                onNodesChange={editor.handleNodesChange}
                // 设置画布的初始视口
                defaultViewport={contextMenu.viewportBeforeRemount ?? editor.initialViewport}
                // editor.initialViewport为空，自动展示全部节点
                fitView={!contextMenu.viewportBeforeRemount && !editor.initialViewport}
                // 自动适配设置最大缩放
                fitViewOptions={{
                  padding: 0.2,
                  maxZoom: 1,
                }}
                deleteKeyCode={null}
                nodesDraggable={!disabled}
                nodesConnectable={!disabled}
                nodesFocusable={!disabled}
                edgesFocusable={!disabled}
                elementsSelectable={!disabled}
                selectNodesOnDrag={false}
                onEdgesChange={editor.handleEdgesChange}
                onEdgeContextMenu={contextMenu.handleEdgeContextMenu}
                onConnect={editor.handleConnect}
                isValidConnection={(connection) =>
                  !disabled && editor.isValidConnection(connection)
                }
                onBeforeDelete={editor.handleBeforeDelete}
                onNodesDelete={editor.handleNodesDelete}
                onNodeClick={(event, node) => {
                  if (disabled) return
                  if (event.metaKey || event.ctrlKey || event.shiftKey) return
                  editor.openNodeConfig(node.id)
                }}
                onNodeContextMenu={contextMenu.handleNodeContextMenu}
                onNodeMouseEnter={(_event, node) => setHoveredNodeId(node.id)}
                onNodeMouseLeave={(_event, node) =>
                  setHoveredNodeId((currentNodeId) =>
                    currentNodeId === node.id ? undefined : currentNodeId,
                  )
                }
                onPaneClick={() => editor.clearSelection()}
                onPaneContextMenu={contextMenu.handlePaneContextMenu}
                aria-disabled={disabled}
                className="bg-muted/30 workflow-editor"
              >
                {/* 总面板组件 */}
                <WorkflowPanel
                  addNodeButtonRef={addNodeButtonRef}
                  selectedNode={editor.selectedNode}
                  selectedNodeCanAddNextNode={
                    editor.selectedNode ? editor.canAddNextNode(editor.selectedNode.id) : false
                  }
                  selectedNodeAvailableVariables={editor.selectedNodeAvailableVariables}
                  selectedNodeDefaultLabel={editor.selectedNodeDefaultLabel}
                  lastSavedAt={save.lastSavedAt}
                  saveStatus={save.status}
                  canRedo={editor.canRedo}
                  canUndo={editor.canUndo}
                  addNodeOpen={disabled ? false : nodePicker.open}
                  nextStepSourceNodeId={nodePicker.connectionSourceNodeId}
                  shortcutHelpOpen={disabled ? false : shortcutHelpOpen}
                  disabled={disabled}
                  onAddNodeOpenChange={handleNodePickerOpenChange}
                  onApplyNode={editor.applyNode}
                  canChangeNextStepNode={(nodeId) =>
                    editor.selectedNode
                      ? editor.canReplaceConnectedNode(editor.selectedNode.id, nodeId)
                      : false
                  }
                  canDeleteNextStepNode={editor.canDeleteNode}
                  onCloseNodeConfig={() => editor.clearSelection()}
                  onChangeNextStepNode={(nodeId, anchorPosition) =>
                    editor.selectedNode
                      ? nodePicker.openReplaceConnectedNode(
                          editor.selectedNode.id,
                          nodeId,
                          anchorPosition,
                        )
                      : false
                  }
                  onDeleteNextStepNode={editor.deleteNode}
                  onDisconnectNextStepNode={editor.disconnectNodes}
                  onNextStepOpenChange={handleNextStepOpenChange}
                  onNextStepNodeSelect={editor.openNodeConfig}
                  onRedo={editor.redo}
                  onShortcutHelpOpenChange={setShortcutHelpOpen}
                  onTestRun={() => void operations.testRun()}
                  onUndo={editor.undo}
                />
                {/* 背景 */}
                <Background bgColor="#f2f4f7" color="#e3e4ec" gap={20} size={2} />
              </ReactFlow>
              <NodeSelectorPopover
                anchor={nodePicker.anchor}
                anchorPosition={nodePicker.anchorPosition}
                nodeTypes={nodePicker.nodeTypes}
                disabledNodeTypes={nodePicker.disabledNodeTypes}
                open={!disabled && nodePicker.open}
                operationLabel={nodePicker.operationLabel}
                keepOpenOnFocusOutside={Boolean(nodePicker.anchorPosition)}
                side={nodePicker.popoverSide}
                align={nodePicker.popoverAlign}
                onOpenChange={handleNodePickerOpenChange}
                onSelectNode={nodePicker.handleSelectNode}
              />
            </div>
          </WorkflowAddNodeProvider>
        </WorkflowContextMenu>
      </WorkflowLoopEditorProvider>
    </>
  )
}

export const WorkflowEditorProvider = (props: WorkflowEditorProps) => {
  return (
    <ReactFlowProvider>
      <WorkflowEditor {...props} />
    </ReactFlowProvider>
  )
}
