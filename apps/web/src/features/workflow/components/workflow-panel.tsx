import { WorkflowConfigPanel } from './workflow-config-panel'
import { WorkflowActionBar } from './workflow-action-bar'
import { WorkflowCanvasToolbar } from './workflow-canvas-toolbar'
import { WorkflowCanvasViewer } from './workflow-canvas-viewer'
import { Panel } from '@xyflow/react'
import { WorkflowStatusPanel } from './workflow-status'
import type { NodeType, WorkflowNode } from '@ai-workflow/core'
import { AnimatePresence, motion, MotionConfig } from 'motion/react'

const MotionPanel = motion.create(Panel)

interface WorkflowPanelProps {
  nodeTypes: readonly NodeType[]
  selectedNode?: WorkflowNode
  onAddNode: (type: string) => void
  onApplyNodeConfig: (node: WorkflowNode) => void
  onCloseNodeConfig: () => void
}

export const WorkflowPanel = ({
  nodeTypes,
  selectedNode,
  onAddNode,
  onApplyNodeConfig,
  onCloseNodeConfig,
}: WorkflowPanelProps) => {
  return (
    <>
      {/* 左上状态栏 */}
      <Panel position="top-left">
        <WorkflowStatusPanel />
      </Panel>
      {/* 右上角操作栏 */}
      <Panel position="top-right">
        <WorkflowActionBar />
      </Panel>
      {/* 底部工具栏 */}
      <Panel position="bottom-center">
        <WorkflowCanvasToolbar nodeTypes={nodeTypes} onAddNode={onAddNode} />
      </Panel>
      {/* 左下角视图调整 */}
      <Panel position="bottom-left">
        <WorkflowCanvasViewer />
      </Panel>
      {/* 右侧配置面板 */}
      <MotionConfig reducedMotion="user">
        <AnimatePresence>
          {selectedNode ? (
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
                onApply={onApplyNodeConfig}
                onClose={onCloseNodeConfig}
              />
            </MotionPanel>
          ) : null}
        </AnimatePresence>
      </MotionConfig>
    </>
  )
}
