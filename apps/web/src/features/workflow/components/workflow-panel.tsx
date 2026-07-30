import { WorkflowConfigPanel } from './workflow-config-panel'
import { WorkflowActionBar } from './workflow-action-bar'
import { WorkflowCanvasToolbar } from './workflow-canvas-toolbar'
import { WorkflowCanvasViewer } from './workflow-canvas-viewer'
import { Panel } from '@xyflow/react'
import { WorkflowStatusPanel } from './workflow-status'
import type { NodeType, WorkflowNode } from '@ai-workflow/core'
import type { AvailableVariableOption } from '@ai-workflow/form/components/node-variable-section'
import { AnimatePresence, motion, MotionConfig } from 'motion/react'
import { WorkflowShortcutHelp } from './workflow-shortcut-help'

const MotionPanel = motion.create(Panel)

interface WorkflowPanelProps {
  nodeTypes: readonly NodeType[]
  disabled?: boolean
  disabledNodeTypes?: ReadonlySet<string>
  addNodeOpen: boolean
  shortcutHelpOpen: boolean
  canRedo: boolean
  canUndo: boolean
  selectedNode?: WorkflowNode
  selectedNodeAvailableVariables?: readonly AvailableVariableOption[]
  selectedNodeDefaultLabel?: string
  onAddNode: (type: string) => void
  onAddNodeOpenChange: (open: boolean) => void
  onApplyNode: (node: WorkflowNode) => void
  onCloseNodeConfig: () => void
  onRedo: () => void
  onShortcutHelpOpenChange: (open: boolean) => void
  onUndo: () => void
}

export const WorkflowPanel = ({
  nodeTypes,
  disabled = false,
  disabledNodeTypes,
  addNodeOpen,
  shortcutHelpOpen,
  canRedo,
  canUndo,
  selectedNode,
  selectedNodeAvailableVariables,
  selectedNodeDefaultLabel,
  onAddNode,
  onAddNodeOpenChange,
  onApplyNode,
  onCloseNodeConfig,
  onRedo,
  onShortcutHelpOpenChange,
  onUndo,
}: WorkflowPanelProps) => {
  return (
    <>
      {/* 左上状态栏 */}
      <Panel position="top-left">
        <WorkflowStatusPanel />
      </Panel>
      {/* 右上角操作栏 */}
      <Panel position="top-right">
        <WorkflowActionBar disabled={disabled} />
      </Panel>
      {/* 底部工具栏 */}
      <Panel position="bottom-center">
        <WorkflowCanvasToolbar
          nodeTypes={nodeTypes}
          disabled={disabled}
          disabledNodeTypes={disabledNodeTypes}
          addNodeOpen={addNodeOpen}
          canRedo={canRedo}
          canUndo={canUndo}
          onAddNode={onAddNode}
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
      {/* 右侧配置面板 */}
      <MotionConfig reducedMotion="user">
        <AnimatePresence>
          {!disabled && selectedNode ? (
            <MotionPanel
              key="workflow-config-panel"
              position="top-right"
              className="top-10! bottom-0! w-100!"
              initial={{ x: '100%', opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: '100%', opacity: 0 }}
              transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
            >
              <WorkflowConfigPanel
                key={selectedNode.id}
                node={selectedNode}
                defaultLabel={selectedNodeDefaultLabel}
                availableVariables={selectedNodeAvailableVariables}
                onApply={onApplyNode}
                onClose={onCloseNodeConfig}
              />
            </MotionPanel>
          ) : null}
        </AnimatePresence>
      </MotionConfig>
    </>
  )
}
