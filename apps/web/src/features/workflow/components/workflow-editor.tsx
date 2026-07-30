import type { WorkflowCanvasNode, WorkflowEditorSnapshot } from '@/components/workflow/types'
import { Background, ConnectionLineType, ReactFlow, ReactFlowProvider } from '@xyflow/react'
import { useWorkflowEditor } from '../hooks/use-workflow-editor'
import type { WorkflowEdge } from '@ai-workflow/core'
import { workflowNodeTypes } from '@/components/workflow/workflow-nodes'
import { WorkflowPanel } from './workflow-panel'
import { useEffect, useRef, useState } from 'react'
import '@xyflow/react/dist/style.css'
import { WorkflowLoopEditorProvider } from '@/components/workflow/workflow-loop-editor-context'
import { useWorkflowShortcuts } from '../hooks/use-workflow-shortcuts'

interface WorkflowEditorProps {
  initialSnapshot: WorkflowEditorSnapshot
  disabled?: boolean
  onSave: (document: WorkflowEditorSnapshot) => void | Promise<void>
}

export function WorkflowEditor({ initialSnapshot, disabled = false, onSave }: WorkflowEditorProps) {
  const canvasRef = useRef<HTMLDivElement>(null)
  const [hoveredNodeId, setHoveredNodeId] = useState<string>()
  const [addNodeOpen, setAddNodeOpen] = useState(false)
  const [shortcutHelpOpen, setShortcutHelpOpen] = useState(false)
  const editor = useWorkflowEditor({ canvasRef, initialSnapshot, onSave })

  useEffect(() => {
    if (!disabled) return

    setAddNodeOpen(false)
    setShortcutHelpOpen(false)
    editor.clearSelection()
  }, [disabled, editor])

  useWorkflowShortcuts({
    editor,
    addNodeOpen,
    shortcutHelpOpen,
    onAddNodeOpenChange: setAddNodeOpen,
    onShortcutHelpOpenChange: setShortcutHelpOpen,
    disabled,
  })
  const renderedEdges = hoveredNodeId
    ? editor.edges.map((edge) =>
        edge.source === hoveredNodeId || edge.target === hoveredNodeId
          ? { ...edge, className: 'workflow-edge--node-hovered' }
          : edge,
      )
    : editor.edges

  return (
    <WorkflowLoopEditorProvider value={editor.loopEditor} disabled={disabled}>
      <ReactFlow<WorkflowCanvasNode, WorkflowEdge>
        ref={canvasRef}
        nodes={editor.nodes}
        edges={renderedEdges}
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
        deleteKeyCode={null}
        nodesDraggable={!disabled}
        nodesConnectable={!disabled}
        nodesFocusable={!disabled}
        edgesFocusable={!disabled}
        elementsSelectable={!disabled}
        selectNodesOnDrag={false}
        onEdgesChange={editor.handleEdgesChange}
        onConnect={editor.handleConnect}
        isValidConnection={(connection) => !disabled && editor.isValidConnection(connection)}
        onBeforeDelete={editor.handleBeforeDelete}
        onNodesDelete={editor.handleNodesDelete}
        onNodeClick={(event, node) => {
          if (disabled) return
          if (event.metaKey || event.ctrlKey || event.shiftKey) return
          editor.openNodeConfig(node.id)
        }}
        onNodeMouseEnter={(_event, node) => setHoveredNodeId(node.id)}
        onNodeMouseLeave={(_event, node) =>
          setHoveredNodeId((currentNodeId) =>
            currentNodeId === node.id ? undefined : currentNodeId,
          )
        }
        onPaneClick={() => editor.clearSelection()}
        // onMoveEnd={(event, viewport) =>
        //   editor.handleViewportChange(viewport, event !== null)
        // }
        aria-disabled={disabled}
        className="bg-muted/30 workflow-editor"
      >
        {/* 总面板组件 */}
        <WorkflowPanel
          nodeTypes={editor.availableNodeTypes}
          selectedNode={editor.selectedNode}
          selectedNodeAvailableVariables={editor.selectedNodeAvailableVariables}
          selectedNodeDefaultLabel={editor.selectedNodeDefaultLabel}
          canRedo={editor.canRedo}
          canUndo={editor.canUndo}
          addNodeOpen={disabled ? false : addNodeOpen}
          shortcutHelpOpen={disabled ? false : shortcutHelpOpen}
          disabled={disabled}
          disabledNodeTypes={editor.disabledNodeTypes}
          onAddNode={editor.addNode}
          onAddNodeOpenChange={setAddNodeOpen}
          onApplyNode={editor.applyNode}
          onCloseNodeConfig={() => editor.clearSelection()}
          onRedo={editor.redo}
          onShortcutHelpOpenChange={setShortcutHelpOpen}
          onUndo={editor.undo}
        />
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
