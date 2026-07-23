import { WorkflowConfigPanel } from '@/components/workflow/workflow-config-panel'
import { WorkflowActionBar } from './workflow-action-bar'
import { WorkflowCanvasToolbar } from './workflow-canvas-toolbar'
import { WorkflowCanvasViewer } from './workflow-canvas-viewer'
import { Panel } from '@xyflow/react'
import { WorkflowStatusPanel } from './workflow-status'
import type { NodeType } from '@ai-workflow/core'

interface WorkflowPanelProps {
  nodeTypes: readonly NodeType[]
  onAddNode: (type: string) => void
}

export const WorkflowPanel = ({ nodeTypes, onAddNode }: WorkflowPanelProps) => {
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
      <Panel position="center-right">
        <WorkflowConfigPanel />
      </Panel>
    </>
  )
}
