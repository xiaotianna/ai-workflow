import { type WorkflowEdge } from '@ai-workflow/core'
import {
  Background,
  Controls,
  ReactFlow,
  type Connection,
  type EdgeChange,
  type NodeChange,
  type Viewport,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import type { WorkflowCanvasNode } from './types'
import { workflowNodeTypes } from './workflow-nodes'

interface WorkflowCanvasProps {
  nodes: WorkflowCanvasNode[]
  edges: WorkflowEdge[]
  initialViewport?: Viewport
  onNodesChange: (changes: NodeChange<WorkflowCanvasNode>[]) => void
  onEdgesChange: (changes: EdgeChange<WorkflowEdge>[]) => void
  onConnect: (connection: Connection) => void
  isValidConnection: (connection: Connection | WorkflowEdge) => boolean
  onNodesDelete: (nodes: WorkflowCanvasNode[]) => void
  onSelectedNodeChange: (nodeId: string | undefined) => void
  onViewportChange: (viewport: Viewport, userInitiated: boolean) => void
}

export const WorkflowCanvas = ({
  edges,
  initialViewport,
  isValidConnection,
  nodes,
  onConnect,
  onEdgesChange,
  onNodesChange,
  onNodesDelete,
  onSelectedNodeChange,
  onViewportChange,
}: WorkflowCanvasProps) => {
  return (
    <ReactFlow<WorkflowCanvasNode, WorkflowEdge>
      nodes={nodes}
      edges={edges}
      nodeTypes={workflowNodeTypes}
      defaultViewport={initialViewport}
      fitView={!initialViewport}
      deleteKeyCode={['Backspace', 'Delete']}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onConnect={onConnect}
      isValidConnection={isValidConnection}
      onNodesDelete={onNodesDelete}
      onSelectionChange={({ nodes: selectedNodes }) =>
        onSelectedNodeChange(selectedNodes.at(-1)?.id)
      }
      onMoveEnd={(event, viewport) => onViewportChange(viewport, event !== null)}
      className="bg-muted/30"
    >
      <Background />
      <Controls />
    </ReactFlow>
  )
}
