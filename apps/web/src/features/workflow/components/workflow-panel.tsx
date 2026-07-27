import { WorkflowConfigPanel } from './workflow-config-panel'
import { WorkflowActionBar } from './workflow-action-bar'
import { WorkflowCanvasToolbar } from './workflow-canvas-toolbar'
import { WorkflowCanvasViewer } from './workflow-canvas-viewer'
import { Panel } from '@xyflow/react'
import { WorkflowStatusPanel } from './workflow-status'
import type { NodeType, WorkflowNode } from '@ai-workflow/core'

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
      {selectedNode ? (
        <Panel position="center-right">
          <WorkflowConfigPanel
            key={selectedNode.id}
            node={selectedNode}
            onApply={onApplyNodeConfig}
            onClose={onCloseNodeConfig}
          />
        </Panel>
      ) : null}
    </>
  )
}
