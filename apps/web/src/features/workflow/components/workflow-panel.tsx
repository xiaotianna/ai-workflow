import { WorkflowConfigPanel } from './workflow-config-panel'
import { WorkflowActionBar } from './workflow-action-bar'
import { WorkflowCanvasToolbar } from './workflow-canvas-toolbar'
import { WorkflowCanvasViewer } from './workflow-canvas-viewer'
import { Panel } from '@xyflow/react'
import { WorkflowStatusPanel } from './workflow-status'
import {
  ERROR_HANDLING_PORT_ID,
  type WorkflowEnvironmentVariable,
  type WorkflowNode,
} from '@ai-workflow/core'
import type { AvailableVariableOption } from '@ai-workflow/form/components/node-variable-section'
import type { NodeConfigRendererMap } from '@ai-workflow/form/components/node-config-section'
import { AnimatePresence, motion, MotionConfig } from 'motion/react'
import { WorkflowShortcutHelp } from './workflow-shortcut-help'
import type { RefObject } from 'react'
import type { WorkflowSaveStatus } from '../hooks/use-workflow-save'
import { WorkflowAuxiliaryPanel, type WorkflowAuxiliaryPanelType } from './workflow-auxiliary-panel'
import type { WorkflowCheckListIssue } from '../utils/workflow-check-list'
import type { WorkflowTestRunResult } from '../hooks/use-workflow-test-run'

interface WorkflowPanelProps {
  appId?: string
  addNodeButtonRef: RefObject<HTMLButtonElement | null>
  disabled?: boolean
  addNodeOpen: boolean
  activeAuxiliaryPanel?: WorkflowAuxiliaryPanelType
  shortcutHelpOpen: boolean
  canRedo: boolean
  canUndo: boolean
  checkListIssues: readonly WorkflowCheckListIssue[]
  configRenderers?: NodeConfigRendererMap
  environmentVariables: readonly WorkflowEnvironmentVariable[]
  nodes: readonly WorkflowNode[]
  nextStepSourceNodeId?: string
  nextStepSourceHandle?: string
  selectedNode?: WorkflowNode
  selectedNodeCanAddErrorBranch?: boolean
  selectedNodeCanAddNextNode?: boolean
  selectedNodeAvailableVariables?: readonly AvailableVariableOption[]
  selectedNodeDefaultLabel?: string
  lastSavedAt?: Date
  publishedAt?: string
  publishLoadError?: boolean
  publishLoading?: boolean
  publishPending?: boolean
  saveStatus: WorkflowSaveStatus
  testRunCanPause?: boolean
  testRunPausing?: boolean
  testRunPending?: boolean
  testRunResult?: WorkflowTestRunResult
  onAddNodeOpenChange: (open: boolean) => void
  onAuxiliaryPanelClose: () => void
  onAuxiliaryPanelToggle: (panel: WorkflowAuxiliaryPanelType) => void
  onApplyNode: (node: WorkflowNode) => void
  onAddEnvironmentVariable: (variable: WorkflowEnvironmentVariable) => void
  canChangeNextStepNode: (nodeId: string, sourceHandle?: string) => boolean
  canDeleteNextStepNode: (nodeId: string) => boolean
  onCloseNodeConfig: () => void
  onCheckListIssueSelect: (nodeId: string) => void
  onNodeDraftValidationIssuesChange: (nodeId: string, messages: readonly string[]) => void
  onChangeNextStepNode: (
    nodeId: string,
    anchorPosition?: { x: number; y: number },
    sourceHandle?: string,
  ) => void
  onDeleteNextStepNode: (nodeId: string) => void
  onDeleteEnvironmentVariable: (variableId: string) => boolean
  onDisconnectNextStepNode: (
    sourceNodeId: string,
    targetNodeId: string,
    sourceHandle?: string,
  ) => void
  onNextStepOpenChange: (
    sourceNodeId: string,
    open: boolean,
    trigger: HTMLButtonElement,
    sourceHandle?: string,
  ) => void
  onNextStepNodeSelect: (nodeId: string) => void
  onRedo: () => void
  onPauseTestRun: () => void
  onPublish: () => void
  onShortcutHelpOpenChange: (open: boolean) => void
  onStartTestRun: (input: Record<string, unknown>) => void
  onTestRun: () => void
  onUndo: () => void
  onUpdateEnvironmentVariable: (variable: WorkflowEnvironmentVariable) => void
}

export const WorkflowPanel = ({
  appId,
  addNodeButtonRef,
  disabled = false,
  addNodeOpen,
  activeAuxiliaryPanel,
  shortcutHelpOpen,
  canRedo,
  canUndo,
  checkListIssues,
  configRenderers,
  environmentVariables,
  nodes,
  nextStepSourceNodeId,
  nextStepSourceHandle,
  selectedNode,
  selectedNodeCanAddErrorBranch = false,
  selectedNodeCanAddNextNode = false,
  selectedNodeAvailableVariables,
  selectedNodeDefaultLabel,
  lastSavedAt,
  publishedAt,
  publishLoadError = false,
  publishLoading = false,
  publishPending = false,
  saveStatus,
  testRunCanPause = false,
  testRunPausing = false,
  testRunPending = false,
  testRunResult,
  onAddNodeOpenChange,
  onAuxiliaryPanelClose,
  onAuxiliaryPanelToggle,
  onApplyNode,
  onAddEnvironmentVariable,
  canChangeNextStepNode,
  canDeleteNextStepNode,
  onCloseNodeConfig,
  onCheckListIssueSelect,
  onNodeDraftValidationIssuesChange,
  onChangeNextStepNode,
  onDeleteNextStepNode,
  onDeleteEnvironmentVariable,
  onDisconnectNextStepNode,
  onNextStepOpenChange,
  onNextStepNodeSelect,
  onRedo,
  onPauseTestRun,
  onPublish,
  onShortcutHelpOpenChange,
  onStartTestRun,
  onTestRun,
  onUndo,
  onUpdateEnvironmentVariable,
}: WorkflowPanelProps) => {
  return (
    <>
      {/* 左上状态栏 */}
      <Panel position="top-left">
        <WorkflowStatusPanel
          lastSavedAt={lastSavedAt}
          publishedAt={publishedAt}
          publishLoadError={publishLoadError}
          publishLoading={publishLoading}
          saveStatus={saveStatus}
        />
      </Panel>
      {/* 右上角操作栏 */}
      <Panel position="top-right" className="z-20!">
        <WorkflowActionBar
          activePanel={activeAuxiliaryPanel}
          checkListIssueCount={checkListIssues.length}
          disabled={disabled}
          publishedAt={publishedAt}
          publishLoadError={publishLoadError}
          publishLoading={publishLoading}
          publishPending={publishPending}
          testRunCanPause={testRunCanPause}
          testRunPausing={testRunPausing}
          testRunPending={testRunPending}
          onPanelToggle={onAuxiliaryPanelToggle}
          onPublish={onPublish}
          onTestRun={onTestRun}
        />
      </Panel>
      {/* 底部工具栏 */}
      <Panel position="bottom-center">
        <WorkflowCanvasToolbar
          addNodeButtonRef={addNodeButtonRef}
          disabled={disabled}
          addNodeOpen={addNodeOpen}
          canRedo={canRedo}
          canUndo={canUndo}
          onAddNodeOpenChange={onAddNodeOpenChange}
          onRedo={onRedo}
          onUndo={onUndo}
        />
      </Panel>
      {/* 左下角视图调整 */}
      <Panel position="bottom-left">
        <WorkflowCanvasViewer disabled={disabled} />
      </Panel>
      {/* 右下角快捷键帮助 */}
      <Panel position="bottom-right">
        <WorkflowShortcutHelp
          open={shortcutHelpOpen}
          disabled={disabled}
          onOpenChange={onShortcutHelpOpenChange}
        />
      </Panel>
      {/* 右侧节点配置与辅助面板 */}
      <MotionConfig reducedMotion="user">
        <Panel
          position="top-right"
          className="pointer-events-none top-14! right-4! bottom-4! isolate m-0! flex max-w-[calc(100%-2rem)] items-stretch justify-end gap-2"
        >
          <AnimatePresence initial={false} mode="popLayout">
            {!disabled && selectedNode ? (
              <motion.div
                key="workflow-config-panel"
                layout="position"
                className="pointer-events-auto z-0 w-100 min-w-0 shrink"
                style={
                  activeAuxiliaryPanel
                    ? { clipPath: 'inset(-1.5rem 0 -1.5rem -1.5rem)' }
                    : undefined
                }
                variants={{
                  enter: {},
                  open: {},
                  exit: { transition: { when: 'afterChildren' } },
                }}
                initial="enter"
                animate="open"
                exit="exit"
                transition={{
                  layout: { duration: 0.24, ease: [0.22, 1, 0.36, 1] },
                }}
              >
                <motion.div
                  className="h-full w-full"
                  variants={{
                    enter: { x: '100%', opacity: 0 },
                    open: {
                      x: 0,
                      opacity: 1,
                      transition: { duration: 0.24, ease: [0.22, 1, 0.36, 1] },
                    },
                    exit: {
                      x: '100%',
                      transition: { duration: 0.24, ease: [0.4, 0, 0.2, 1] },
                    },
                  }}
                >
                  <WorkflowConfigPanel
                    key={selectedNode.id}
                    node={selectedNode}
                    configRenderers={configRenderers}
                    defaultLabel={selectedNodeDefaultLabel}
                    availableVariables={selectedNodeAvailableVariables}
                    nextStepDisabled={!selectedNodeCanAddNextNode}
                    errorBranchNextStepDisabled={!selectedNodeCanAddErrorBranch}
                    nextStepOpen={
                      nextStepSourceNodeId === selectedNode.id && nextStepSourceHandle === undefined
                    }
                    errorBranchNextStepOpen={
                      nextStepSourceNodeId === selectedNode.id &&
                      nextStepSourceHandle === ERROR_HANDLING_PORT_ID
                    }
                    onApply={onApplyNode}
                    onClose={onCloseNodeConfig}
                    onDraftValidationIssuesChange={onNodeDraftValidationIssuesChange}
                    canChangeNextStepNode={canChangeNextStepNode}
                    canDeleteNextStepNode={canDeleteNextStepNode}
                    onChangeNextStepNode={onChangeNextStepNode}
                    onDeleteNextStepNode={onDeleteNextStepNode}
                    onDisconnectNextStepNode={(targetNodeId, sourceHandle) =>
                      onDisconnectNextStepNode(selectedNode.id, targetNodeId, sourceHandle)
                    }
                    onNextStepOpenChange={(open, trigger, sourceHandle) =>
                      onNextStepOpenChange(selectedNode.id, open, trigger, sourceHandle)
                    }
                    onNextStepNodeSelect={onNextStepNodeSelect}
                  />
                </motion.div>
              </motion.div>
            ) : null}

            {!disabled && activeAuxiliaryPanel ? (
              <motion.div
                key="workflow-auxiliary-panel"
                layout="position"
                className="pointer-events-auto z-10 w-100 min-w-0 shrink-0 origin-top-right"
                initial={
                  activeAuxiliaryPanel === 'check-list'
                    ? { y: -8, scale: 0.98, opacity: 0 }
                    : { x: '100%', opacity: 0 }
                }
                animate={
                  activeAuxiliaryPanel === 'check-list'
                    ? { y: 0, scale: 1, opacity: 1 }
                    : { x: 0, opacity: 1 }
                }
                exit={
                  activeAuxiliaryPanel === 'check-list'
                    ? { y: -8, scale: 0.98, opacity: 0 }
                    : { x: '100%', opacity: 0 }
                }
                transition={{
                  duration: 0.24,
                  ease: [0.22, 1, 0.36, 1],
                  layout: { duration: 0.24, ease: [0.22, 1, 0.36, 1] },
                }}
              >
                <WorkflowAuxiliaryPanel
                  appId={appId}
                  type={activeAuxiliaryPanel}
                  checkListIssues={checkListIssues}
                  environmentVariables={environmentVariables}
                  nodes={nodes}
                  testRunPausing={testRunPausing}
                  testRunPending={testRunPending}
                  testRunResult={testRunResult}
                  onClose={onAuxiliaryPanelClose}
                  onCheckListIssueSelect={onCheckListIssueSelect}
                  onAddEnvironmentVariable={onAddEnvironmentVariable}
                  onDeleteEnvironmentVariable={onDeleteEnvironmentVariable}
                  onPauseTestRun={onPauseTestRun}
                  onStartTestRun={onStartTestRun}
                  onUpdateEnvironmentVariable={onUpdateEnvironmentVariable}
                />
              </motion.div>
            ) : null}
          </AnimatePresence>
        </Panel>
      </MotionConfig>
    </>
  )
}
