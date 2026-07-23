import type { WorkflowCanvasNode, WorkflowEditorSnapshot } from '@/components/workflow/types'
import { Background, ReactFlow, ReactFlowProvider } from '@xyflow/react'
import { useWorkflowEditor } from '../hooks/use-workflow-editor'
import type { WorkflowEdge } from '@ai-workflow/core'
import { workflowNodeTypes } from '@/components/workflow/workflow-nodes'
import { WorkflowPanel } from './workflow-panel'
import '@xyflow/react/dist/style.css'

interface WorkflowEditorProps {
  initialSnapshot: WorkflowEditorSnapshot
  onSave: (document: WorkflowEditorSnapshot) => void | Promise<void>
}

export function WorkflowEditor({ initialSnapshot, onSave }: WorkflowEditorProps) {
  const editor = useWorkflowEditor({ initialSnapshot, onSave })
  return (
    <ReactFlow<WorkflowCanvasNode, WorkflowEdge>
      nodes={editor.nodes}
      edges={editor.edges}
      nodeTypes={workflowNodeTypes}
      proOptions={{ hideAttribution: true }}
      onNodesChange={editor.handleNodesChange}
      // defaultViewport={initialViewport}
      // fitView={!initialViewport}
      // deleteKeyCode={['Backspace', 'Delete']}
      // onEdgesChange={onEdgesChange}
      // onConnect={onConnect}
      // isValidConnection={isValidConnection}
      // onNodesDelete={onNodesDelete}
      // onSelectionChange={({ nodes: selectedNodes }) =>
      //   onSelectedNodeChange(selectedNodes.at(-1)?.id)
      // }
      // onMoveEnd={(event, viewport) =>
      //   onViewportChange(viewport, event !== null)
      // }
      className="bg-muted/30 workflow-editor"
    >
      {/* 总面板组件 */}
      <WorkflowPanel />
      {/* 背景 */}
      <Background bgColor="#f2f4f7" color="#e3e4ec" gap={20} size={2} />
    </ReactFlow>
  )
}

export const WorkflowEditorProvider = (props: WorkflowEditorProps) => {
  return (
    <ReactFlowProvider>
      <WorkflowEditor {...props} />
    </ReactFlowProvider>
  )
}
