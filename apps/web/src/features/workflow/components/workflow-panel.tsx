import { WorkflowConfigPanel } from './workflow-config-panel'
import { WorkflowActionBar } from './workflow-action-bar'
import { WorkflowCanvasToolbar } from './workflow-canvas-toolbar'
import { WorkflowCanvasViewer } from './workflow-canvas-viewer'
import { Panel } from '@xyflow/react'
import { WorkflowStatusPanel } from './workflow-status'
import type { WorkflowNode } from '@ai-workflow/core'
import type { AvailableVariableOption } from '@ai-workflow/form/components/node-variable-section'
import type { NodeConfigRendererMap } from '@ai-workflow/form/components/node-config-section'
import { AnimatePresence, motion, MotionConfig } from 'motion/react'
import { WorkflowShortcutHelp } from './workflow-shortcut-help'
import type { RefObject } from 'react'
import type { WorkflowSaveStatus } from '../hooks/use-workflow-save'
import { WorkflowAuxiliaryPanel, type WorkflowAuxiliaryPanelType } from './workflow-auxiliary-panel'

interface WorkflowPanelProps {
  addNodeButtonRef: RefObject<HTMLButtonElement | null>
  disabled?: boolean
  addNodeOpen: boolean
  activeAuxiliaryPanel?: WorkflowAuxiliaryPanelType
  shortcutHelpOpen: boolean
  canRedo: boolean
  canUndo: boolean
  configRenderers?: NodeConfigRendererMap
  nextStepSourceNodeId?: string
  selectedNode?: WorkflowNode
  selectedNodeCanAddNextNode?: boolean
  selectedNodeAvailableVariables?: readonly AvailableVariableOption[]
  selectedNodeDefaultLabel?: string
  lastSavedAt?: Date
  saveStatus: WorkflowSaveStatus
  onAddNodeOpenChange: (open: boolean) => void
  onAuxiliaryPanelClose: () => void
  onAuxiliaryPanelToggle: (panel: WorkflowAuxiliaryPanelType) => void
  onApplyNode: (node: WorkflowNode) => void
  canChangeNextStepNode: (nodeId: string) => boolean
  canDeleteNextStepNode: (nodeId: string) => boolean
  onCloseNodeConfig: () => void
  onChangeNextStepNode: (nodeId: string, anchorPosition?: { x: number; y: number }) => void
  onDeleteNextStepNode: (nodeId: string) => void
  onDisconnectNextStepNode: (sourceNodeId: string, targetNodeId: string) => void
  onNextStepOpenChange: (sourceNodeId: string, open: boolean, trigger: HTMLButtonElement) => void
  onNextStepNodeSelect: (nodeId: string) => void
  onRedo: () => void
  onShortcutHelpOpenChange: (open: boolean) => void
  onTestRun: () => void
  onUndo: () => void
}

export const WorkflowPanel = ({
  addNodeButtonRef,
  disabled = false,
  addNodeOpen,
  activeAuxiliaryPanel,
  shortcutHelpOpen,
  canRedo,
  canUndo,
  configRenderers,
  nextStepSourceNodeId,
  selectedNode,
  selectedNodeCanAddNextNode = false,
  selectedNodeAvailableVariables,
  selectedNodeDefaultLabel,
  lastSavedAt,
  saveStatus,
  onAddNodeOpenChange,
  onAuxiliaryPanelClose,
  onAuxiliaryPanelToggle,
  onApplyNode,
  canChangeNextStepNode,
  canDeleteNextStepNode,
  onCloseNodeConfig,
  onChangeNextStepNode,
  onDeleteNextStepNode,
  onDisconnectNextStepNode,
  onNextStepOpenChange,
  onNextStepNodeSelect,
  onRedo,
  onShortcutHelpOpenChange,
  onTestRun,
  onUndo,
}: WorkflowPanelProps) => {
  return (
    <>
      {/* 左上状态栏 */}
      <Panel position="top-left">
        <WorkflowStatusPanel lastSavedAt={lastSavedAt} saveStatus={saveStatus} />
      </Panel>
      {/* 右上角操作栏 */}
      <Panel position="top-right" className="z-20!">
        <WorkflowActionBar
          activePanel={activeAuxiliaryPanel}
          disabled={disabled}
          onPanelToggle={onAuxiliaryPanelToggle}
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
                    nextStepOpen={nextStepSourceNodeId === selectedNode.id}
                    onApply={onApplyNode}
                    onClose={onCloseNodeConfig}
                    canChangeNextStepNode={canChangeNextStepNode}
                    canDeleteNextStepNode={canDeleteNextStepNode}
                    onChangeNextStepNode={onChangeNextStepNode}
                    onDeleteNextStepNode={onDeleteNextStepNode}
                    onDisconnectNextStepNode={(targetNodeId) =>
                      onDisconnectNextStepNode(selectedNode.id, targetNodeId)
                    }
                    onNextStepOpenChange={(open, trigger) =>
                      onNextStepOpenChange(selectedNode.id, open, trigger)
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
                className="pointer-events-auto z-10 w-100 min-w-0 shrink-0"
                initial={{ x: '100%', opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: '100%', opacity: 0 }}
                transition={{
                  duration: 0.24,
                  ease: [0.22, 1, 0.36, 1],
                  layout: { duration: 0.24, ease: [0.22, 1, 0.36, 1] },
                }}
              >
                <WorkflowAuxiliaryPanel
                  type={activeAuxiliaryPanel}
                  onClose={onAuxiliaryPanelClose}
                />
              </motion.div>
            ) : null}
          </AnimatePresence>
        </Panel>
      </MotionConfig>
    </>
  )
}
