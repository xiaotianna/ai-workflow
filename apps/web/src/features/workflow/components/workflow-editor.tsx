import type { WorkflowCanvasNode, WorkflowEditorSnapshot } from '@/components/workflow/types'
import { Background, ConnectionLineType, ReactFlow, ReactFlowProvider } from '@xyflow/react'
import { useWorkflowEditor } from '../hooks/use-workflow-editor'
import { ERROR_HANDLING_PORT_ID, type WorkflowEdge } from '@ai-workflow/core'
import { workflowNodeTypes } from '@/components/workflow/workflow-nodes'
import { WorkflowPanel } from './workflow-panel'
import { useEffect, useMemo, useRef, useState } from 'react'
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
import { WorkflowModelCatalogProvider } from '@/components/workflow/workflow-model-catalog-context'
import { WorkflowKnowledgeBaseCatalogProvider } from '@/components/workflow/workflow-knowledge-base-catalog-context'
import { WorkflowStudioAppCatalogProvider } from '@/components/workflow/workflow-studio-app-catalog-context'
import { WorkflowEnvironmentVariablesProvider } from '@/components/workflow/workflow-environment-variables-context'
import type { NodeConfigRendererMap } from '@ai-workflow/form/components/node-config-section'
import type { WorkflowAuxiliaryPanelType } from './workflow-auxiliary-panel'
import {
  appendWorkflowNodeDraftValidationIssues,
  createWorkflowCheckListIssues,
} from '../utils/workflow-check-list'
import {
  getWorkflowEdgeExecutionClassName,
  resolveWorkflowEdgeExecutionStatus,
} from '../utils/workflow-edge-execution'
import { useWorkflowExecutionCamera } from '../hooks/use-workflow-execution-camera'
import type { WorkflowVersionHistoryPublishSync } from '../hooks/use-workflow-version-history'
import type {
  WorkflowNodeExecutionStatuses,
  WorkflowTestRunRequest,
  WorkflowTestRunResult,
} from '../hooks/use-workflow-test-run'

const EMPTY_NODE_EXECUTION_STATUSES: WorkflowNodeExecutionStatuses = {}

function WorkflowExecutionCamera({
  nodeExecutionStatuses,
}: {
  nodeExecutionStatuses: WorkflowNodeExecutionStatuses
}) {
  useWorkflowExecutionCamera(nodeExecutionStatuses)
  return null
}

interface WorkflowEditorProps {
  applicationMetadata?: WorkflowApplicationMetadata
  configRenderers?: NodeConfigRendererMap
  initialSavedAt?: Date
  initialSnapshot: WorkflowEditorSnapshot
  disabled?: boolean
  onSave: (document: WorkflowEditorSnapshot) => void | Promise<void>
  onPauseTestRun?: () => Promise<void>
  onPublish?: (snapshot: WorkflowEditorSnapshot) => Promise<unknown>
  onRestoreVersion?: (versionId: string) => Promise<void>
  onSelectCurrentDraft?: () => void | Promise<void>
  onTestRun?: (request: WorkflowTestRunRequest) => Promise<WorkflowTestRunResult>
  publishedAt?: string
  publishLoadError?: boolean
  publishLoading?: boolean
  publishPending?: boolean
  publishSync?: WorkflowVersionHistoryPublishSync
  selectedVersionId?: string
  testRunCanPause?: boolean
  testRunResult?: WorkflowTestRunResult
  testRunPausing?: boolean
  testRunPending?: boolean
  nodeExecutionStatuses?: WorkflowNodeExecutionStatuses
}

export function WorkflowEditor({
  applicationMetadata,
  configRenderers,
  initialSavedAt,
  initialSnapshot,
  disabled = false,
  onSave,
  onPauseTestRun,
  onPublish,
  onRestoreVersion,
  onSelectCurrentDraft,
  onTestRun,
  publishedAt,
  publishLoadError = false,
  publishLoading = false,
  publishPending = false,
  publishSync,
  selectedVersionId,
  testRunCanPause = false,
  testRunResult,
  testRunPausing = false,
  testRunPending = false,
  nodeExecutionStatuses = EMPTY_NODE_EXECUTION_STATUSES,
}: WorkflowEditorProps) {
  const canvasRef = useRef<HTMLDivElement>(null)
  const addNodeButtonRef = useRef<HTMLButtonElement>(null)
  const [hoveredNodeId, setHoveredNodeId] = useState<string>()
  const [shortcutHelpOpen, setShortcutHelpOpen] = useState(false)
  const [activeAuxiliaryPanel, setActiveAuxiliaryPanel] = useState<WorkflowAuxiliaryPanelType>()
  const [singleNodeTestRunOpen, setSingleNodeTestRunOpen] = useState(false)
  const [lastRunRefreshKey, setLastRunRefreshKey] = useState(0)
  const [focusLastRunTabKey, setFocusLastRunTabKey] = useState(0)
  const wasTestRunPendingRef = useRef(false)
  const editor = useWorkflowEditor({ canvasRef, initialSnapshot })
  const persistedCheckListIssues = useMemo(
    () => createWorkflowCheckListIssues(editor.workflow),
    [editor.workflow],
  )
  const checkListIssues = appendWorkflowNodeDraftValidationIssues(
    persistedCheckListIssues,
    editor.nodeDraftValidationIssues?.nodeId === editor.selectedNode?.id
      ? editor.selectedNode
      : undefined,
    editor.nodeDraftValidationIssues?.messages ?? [],
  )
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
    checkListIssues,
    editor,
    onCheckListRequired: () => setActiveAuxiliaryPanel('check-list'),
    onOpenSingleNodeTestRun: (nodeId) => {
      editor.openNodeConfig(nodeId)
      setSingleNodeTestRunOpen(true)
    },
    onPauseTestRun,
    onPublish,
    onTestRun,
    onTestRunStart: () => setActiveAuxiliaryPanel('test-run'),
    publishPending,
    testRunCanPause,
    testRunPausing,
    testRunPending,
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
    sourceHandle?: string,
  ) {
    if (nextOpen) {
      nodePicker.openConnectNextNode(sourceNodeId, trigger, sourceHandle)
      return
    }

    handleNodePickerOpenChange(false)
  }

  function handleAuxiliaryPanelToggle(panel: WorkflowAuxiliaryPanelType) {
    setActiveAuxiliaryPanel((currentPanel) => (currentPanel === panel ? undefined : panel))
  }

  function handleTestRunAction() {
    if (operations.testRunPending) {
      void operations.pauseTestRun()
      return
    }

    handleAuxiliaryPanelToggle('test-run')
  }

  function handleOpenNodeConfig(nodeId: string) {
    setSingleNodeTestRunOpen(false)
    editor.openNodeConfig(nodeId)
  }

  async function handleSubmitSingleNodeTestRun(nodeId: string, input: Record<string, unknown>) {
    try {
      const result = await operations.runNode(nodeId, input)
      if (!result || result.status === 'CANCELLED') return
      setSingleNodeTestRunOpen(false)
      setFocusLastRunTabKey((current) => current + 1)
    } catch {
      // Toast 已在 operations.runNode 中处理
    }
  }

  useEffect(() => {
    if (wasTestRunPendingRef.current && !testRunPending) {
      setLastRunRefreshKey((current) => current + 1)
    }
    wasTestRunPendingRef.current = testRunPending
  }, [testRunPending])

  useEffect(() => {
    if (!disabled) return

    nodePicker.close()
    contextMenu.close()
    operations.setImportDialogOpen(false)
    setShortcutHelpOpen(false)
    setActiveAuxiliaryPanel(undefined)
    setSingleNodeTestRunOpen(false)
    editor.clearSelection()
  }, [disabled])

  useEffect(() => {
    const sourceNodeId = nodePicker.connectionSourceNodeId
    if (!sourceNodeId) return

    if (!editor.canAddNextNode(sourceNodeId, nodePicker.connectionSourceHandle)) {
      nodePicker.close()
    }
  }, [
    editor.edges,
    editor.nodes,
    nodePicker.connectionSourceHandle,
    nodePicker.connectionSourceNodeId,
  ])

  useWorkflowShortcuts({
    editor,
    addNodeOpen: nodePicker.open,
    auxiliaryPanelOpen: Boolean(activeAuxiliaryPanel),
    interactionBlocked: contextMenu.open || operations.importDialogOpen,
    shortcutHelpOpen,
    onAddNodeOpenChange: handleNodePickerOpenChange,
    onAuxiliaryPanelOpenChange: (open) => {
      if (!open) setActiveAuxiliaryPanel(undefined)
    },
    onPublish: () => void operations.publish(),
    onSave: save.saveNow,
    onShortcutHelpOpenChange: setShortcutHelpOpen,
    onTestRun: handleTestRunAction,
    disabled,
  })
  const renderedEdges = useMemo(
    () =>
      editor.edges.map((edge) => {
        const executionStatus = resolveWorkflowEdgeExecutionStatus(
          nodeExecutionStatuses[edge.source],
          nodeExecutionStatuses[edge.target],
        )
        const executionClassName = getWorkflowEdgeExecutionClassName(executionStatus)
        const hovered =
          Boolean(hoveredNodeId) && (edge.source === hoveredNodeId || edge.target === hoveredNodeId)
        const className =
          executionClassName ?? (hovered ? 'workflow-edge--node-hovered' : undefined)

        if (!className) return edge

        return {
          ...edge,
          className,
        }
      }),
    [editor.edges, hoveredNodeId, nodeExecutionStatuses],
  )
  const renderedNodes = useMemo(
    () =>
      editor.nodes.map((node) => {
        const executionStatus = nodeExecutionStatuses[node.id]
        const loopIteration = testRunResult?.loopIterations[node.id]
        if (!executionStatus && !loopIteration) return node

        return {
          ...node,
          data: {
            ...node.data,
            executionStatus,
            ...(loopIteration
              ? {
                  executionProgress: {
                    current: loopIteration.iteration,
                    total: loopIteration.maxIterations,
                  },
                }
              : {}),
          },
        }
      }),
    [editor.nodes, nodeExecutionStatuses, testRunResult?.loopIterations],
  )
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
        description="导入后将覆盖当前画布中的全部节点、连线、环境变量和布局。此操作仍可通过撤销恢复，请确认后继续。"
        confirmLabel="确认导入"
        onImport={operations.importDsl}
        onOpenChange={operations.setImportDialogOpen}
      />

      <WorkflowModelCatalogProvider enabled={!disabled}>
        <WorkflowKnowledgeBaseCatalogProvider enabled={!disabled}>
          <WorkflowStudioAppCatalogProvider
            enabled={!disabled}
            currentAppId={applicationMetadata?.id}
            currentWorkflowId={editor.workflow.id}
          >
            <WorkflowEnvironmentVariablesProvider variables={editor.environmentVariables}>
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
                        nodes={renderedNodes}
                        edges={renderedEdges}
                        nodeTypes={workflowNodeTypes}
                        edgeTypes={workflowEdgeTypes}
                        defaultEdgeOptions={{ type: ConnectionLineType.Bezier }}
                        connectionLineType={ConnectionLineType.Bezier}
                        proOptions={{ hideAttribution: true }}
                        onNodesChange={editor.handleNodesChange}
                        // 设置画布的初始视口
                        defaultViewport={
                          contextMenu.viewportBeforeRemount ?? editor.initialViewport
                        }
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
                          handleOpenNodeConfig(node.id)
                        }}
                        onNodeContextMenu={contextMenu.handleNodeContextMenu}
                        onNodeMouseEnter={(_event, node) => setHoveredNodeId(node.id)}
                        onNodeMouseLeave={(_event, node) =>
                          setHoveredNodeId((currentNodeId) =>
                            currentNodeId === node.id ? undefined : currentNodeId,
                          )
                        }
                        onPaneClick={() => {
                          setSingleNodeTestRunOpen(false)
                          editor.clearSelection()
                        }}
                        onPaneContextMenu={contextMenu.handlePaneContextMenu}
                        aria-disabled={disabled}
                        className="bg-muted/30 workflow-editor"
                      >
                        <WorkflowExecutionCamera nodeExecutionStatuses={nodeExecutionStatuses} />
                        {/* 总面板组件 */}
                        <WorkflowPanel
                          appId={applicationMetadata?.id}
                          addNodeButtonRef={addNodeButtonRef}
                          activeAuxiliaryPanel={activeAuxiliaryPanel}
                          selectedNode={editor.selectedNode}
                          selectedNodeCanAddNextNode={
                            editor.selectedNode
                              ? editor.canAddNextNode(editor.selectedNode.id)
                              : false
                          }
                          selectedNodeCanAddErrorBranch={
                            editor.selectedNode
                              ? editor.canAddNextNode(
                                  editor.selectedNode.id,
                                  ERROR_HANDLING_PORT_ID,
                                )
                              : false
                          }
                          selectedNodeAvailableVariables={editor.selectedNodeAvailableVariables}
                          selectedNodeCanRun={
                            editor.selectedNode ? editor.canRunNode(editor.selectedNode.id) : false
                          }
                          selectedNodeDefaultLabel={editor.selectedNodeDefaultLabel}
                          focusLastRunTabKey={focusLastRunTabKey}
                          lastRunRefreshKey={lastRunRefreshKey}
                          lastSavedAt={save.lastSavedAt}
                          singleNodeTestRunOpen={singleNodeTestRunOpen}
                          publishedAt={publishedAt}
                          publishLoadError={publishLoadError}
                          publishLoading={publishLoading}
                          publishPending={operations.publishPending}
                          publishSync={publishSync}
                          saveStatus={save.status}
                          canRedo={editor.canRedo}
                          canUndo={editor.canUndo}
                          checkListIssues={checkListIssues}
                          configRenderers={configRenderers}
                          environmentVariables={editor.environmentVariables}
                          nodes={editor.workflow.nodes}
                          addNodeOpen={disabled ? false : nodePicker.open}
                          nextStepSourceNodeId={nodePicker.connectionSourceNodeId}
                          nextStepSourceHandle={nodePicker.connectionSourceHandle}
                          shortcutHelpOpen={disabled ? false : shortcutHelpOpen}
                          testRunResult={testRunResult}
                          selectedVersionId={selectedVersionId}
                          disabled={disabled}
                          onAddNodeOpenChange={handleNodePickerOpenChange}
                          onAuxiliaryPanelClose={() => setActiveAuxiliaryPanel(undefined)}
                          onAuxiliaryPanelToggle={handleAuxiliaryPanelToggle}
                          onApplyNode={editor.applyNode}
                          onAddEnvironmentVariable={editor.addEnvironmentVariable}
                          canChangeNextStepNode={(nodeId, sourceHandle) =>
                            editor.selectedNode
                              ? editor.canReplaceConnectedNode(
                                  editor.selectedNode.id,
                                  nodeId,
                                  sourceHandle,
                                )
                              : false
                          }
                          canDeleteNextStepNode={editor.canDeleteNode}
                          onCloseNodeConfig={() => {
                            setSingleNodeTestRunOpen(false)
                            editor.clearSelection()
                          }}
                          onCloseSingleNodeTestRun={() => setSingleNodeTestRunOpen(false)}
                          onCheckListIssueSelect={handleOpenNodeConfig}
                          onNodeDraftValidationIssuesChange={editor.setNodeDraftValidationIssues}
                          onChangeNextStepNode={(nodeId, anchorPosition, sourceHandle) =>
                            editor.selectedNode
                              ? nodePicker.openReplaceConnectedNode(
                                  editor.selectedNode.id,
                                  nodeId,
                                  anchorPosition,
                                  sourceHandle,
                                )
                              : false
                          }
                          onDeleteNextStepNode={editor.deleteNode}
                          onDeleteEnvironmentVariable={editor.deleteEnvironmentVariable}
                          onDisconnectNextStepNode={editor.disconnectNodes}
                          onNextStepOpenChange={handleNextStepOpenChange}
                          onNextStepNodeSelect={handleOpenNodeConfig}
                          onRedo={editor.redo}
                          onOpenSingleNodeTestRun={(nodeId) =>
                            operations.openSingleNodeTestRun(nodeId)
                          }
                          onPauseTestRun={() => void operations.pauseTestRun()}
                          onPublish={() => void operations.publish()}
                          onRestoreVersion={onRestoreVersion}
                          onSelectCurrentDraft={() => void onSelectCurrentDraft?.()}
                          onShortcutHelpOpenChange={setShortcutHelpOpen}
                          onStartTestRun={(input) => void operations.testRun(input)}
                          onSubmitSingleNodeTestRun={handleSubmitSingleNodeTestRun}
                          onTestRun={handleTestRunAction}
                          testRunCanPause={operations.testRunCanPause}
                          testRunPausing={operations.testRunPausing}
                          testRunPending={operations.testRunPending}
                          onUndo={editor.undo}
                          onUpdateEnvironmentVariable={editor.updateEnvironmentVariable}
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
            </WorkflowEnvironmentVariablesProvider>
          </WorkflowStudioAppCatalogProvider>
        </WorkflowKnowledgeBaseCatalogProvider>
      </WorkflowModelCatalogProvider>
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
