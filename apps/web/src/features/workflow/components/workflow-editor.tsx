import type { WorkflowCanvasNode, WorkflowEditorSnapshot } from '@/components/workflow/types'
import { Background, ConnectionLineType, ReactFlow, ReactFlowProvider } from '@xyflow/react'
import { useWorkflowEditor } from '../hooks/use-workflow-editor'
import type { WorkflowEdge } from '@ai-workflow/core'
import { workflowNodeTypes } from '@/components/workflow/workflow-nodes'
import { WorkflowPanel } from './workflow-panel'
import { useRef } from 'react'
import '@xyflow/react/dist/style.css'
import { WorkflowLoopEditorProvider } from '@/components/workflow/workflow-loop-editor-context'

interface WorkflowEditorProps {
  initialSnapshot: WorkflowEditorSnapshot
  onSave: (document: WorkflowEditorSnapshot) => void | Promise<void>
}

export function WorkflowEditor({ initialSnapshot, onSave }: WorkflowEditorProps) {
  const canvasRef = useRef<HTMLDivElement>(null)
  const editor = useWorkflowEditor({ canvasRef, initialSnapshot, onSave })

  return (
    <WorkflowLoopEditorProvider value={editor.loopEditor}>
      <ReactFlow<WorkflowCanvasNode, WorkflowEdge>
        ref={canvasRef}
        nodes={editor.nodes}
        edges={editor.edges}
        nodeTypes={workflowNodeTypes}
        defaultEdgeOptions={{ type: ConnectionLineType.Bezier }}
        connectionLineType={ConnectionLineType.Bezier}
        proOptions={{ hideAttribution: true }}
        onNodesChange={editor.handleNodesChange}
        // 设置画布的初始视口
        defaultViewport={editor.initialViewport}
        // editor.initialViewport为空，自动展示全部节点
        fitView={!editor.initialViewport}
        // 自动适配设置最大缩放
        fitViewOptions={{
          padding: 0.2,
          maxZoom: 1,
        }}
        deleteKeyCode={['Backspace', 'Delete']}
        onEdgesChange={editor.handleEdgesChange}
        onConnect={editor.handleConnect}
        isValidConnection={editor.isValidConnection}
        onBeforeDelete={editor.handleBeforeDelete}
        onNodesDelete={editor.handleNodesDelete}
        // onSelectionChange={({ nodes: selectedNodes }) =>
        //   editor.selectNode(selectedNodes.at(-1)?.id)
        // }
        // onMoveEnd={(event, viewport) =>
        //   editor.handleViewportChange(viewport, event !== null)
        // }
        className="bg-muted/30 workflow-editor"
      >
        {/* 总面板组件 */}
        <WorkflowPanel nodeTypes={editor.availableNodeTypes} onAddNode={editor.addNode} />
        {/* 背景 */}
        <Background bgColor="#f2f4f7" color="#e3e4ec" gap={20} size={2} />
      </ReactFlow>
    </WorkflowLoopEditorProvider>
  )
}

export const WorkflowEditorProvider = (props: WorkflowEditorProps) => {
  return (
    <ReactFlowProvider>
      <WorkflowEditor {...props} />
    </ReactFlowProvider>
  )
}
