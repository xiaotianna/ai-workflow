import type { WorkflowCanvasNode } from '@/components/workflow/types'
import { WorkflowCanvas } from '@/components/workflow/workflow-canvas'
import { createDemoWorkflowDocument } from '@/features/workflow/data'
import { canConnect } from '@/utils/workflow/can-connect'
import { toCanvasNodes } from '@/utils/workflow/to-canvas-nodes'
import type { WorkflowEdge } from '@ai-workflow/core'
import {
  useEdgesState,
  useNodesState,
  type Connection,
  type EdgeChange,
  type NodeChange,
  type Viewport,
} from '@xyflow/react'
import { useState } from 'react'

const initialDocument = createDemoWorkflowDocument('1')

function handleConnect(_connection: Connection) {
  // if (!canConnect(connection, initialDocument.workflow, nodes, edges)) return
  // const nextEdge = createWorkflowEdge(connection)
  // if (!nextEdge) return
  // setEdges((currentEdges) => [...currentEdges, nextEdge])
  // setDirty(true)
}

export default function AppWorkflowPage() {
  const [nodes, , applyNodeChanges] = useNodesState<WorkflowCanvasNode>(
    toCanvasNodes(initialDocument),
  )
  const [edges, setEdges, applyEdgeChanges] = useEdgesState<WorkflowEdge>([
    ...initialDocument.workflow.edges,
  ])
  const [, setViewport] = useState<Viewport | undefined>(initialDocument.layout.viewport)
  const [selectedNodeId, setSelectedNodeId] = useState<string>()
  // const [dirty, setDirty] = useState(false)
  // const [saving, setSaving] = useState(false)
  // const [errors, setErrors] = useState<string[]>([])
  // const updateNodeInternals = useUpdateNodeInternals()

  // const availableNodeTypes = nodeRegistry.list()
  // const selectedCanvasNode = nodes.find((node) => node.id === selectedNodeId)
  // const selectedNode: WorkflowNode | undefined = selectedCanvasNode
  //   ? {
  //       id: selectedCanvasNode.id,
  //       type: selectedCanvasNode.type,
  //       config: selectedCanvasNode.data
  //     }
  //   : undefined

  function handleNodesChange(changes: NodeChange<WorkflowCanvasNode>[]) {
    applyNodeChanges(changes)
    // if (hasNodeMutation(changes)) setDirty(true)
  }

  function handleEdgesChange(changes: EdgeChange<WorkflowEdge>[]) {
    applyEdgeChanges(changes)
    // if (hasEdgeMutation(changes)) setDirty(true)
  }

  function handleNodesDelete(deletedNodes: WorkflowCanvasNode[]) {
    const deletedNodeIds = new Set(deletedNodes.map((node) => node.id))

    setEdges((currentEdges) =>
      currentEdges.filter(
        (edge) => !deletedNodeIds.has(edge.source) && !deletedNodeIds.has(edge.target),
      ),
    )

    if (selectedNodeId && deletedNodeIds.has(selectedNodeId)) {
      setSelectedNodeId(undefined)
    }

    // setDirty(true)
  }

  // function handleDeleteSelectedNode() {
  //   if (!selectedNodeId) return

  //   setNodes((currentNodes) =>
  //     currentNodes.filter((node) => node.id !== selectedNodeId)
  //   )
  //   setEdges((currentEdges) =>
  //     currentEdges.filter(
  //       (edge) =>
  //         edge.source !== selectedNodeId && edge.target !== selectedNodeId
  //     )
  //   )
  //   setSelectedNodeId(undefined)
  //   setDirty(true)
  // }

  // function handleApplyNode(nextNode: WorkflowNode) {
  //   setNodes((currentNodes) =>
  //     currentNodes.map((canvasNode) =>
  //       canvasNode.id === nextNode.id
  //         ? { ...canvasNode, type: nextNode.type, data: nextNode.config }
  //         : canvasNode
  //     )
  //   )
  //   // setEdges((currentEdges) => removeDanglingEdges(nextNode, currentEdges))
  //   setDirty(true)

  //   requestAnimationFrame(() => updateNodeInternals(nextNode.id))
  // }

  function handleViewportChange(nextViewport: Viewport, _userInitiated: boolean) {
    setViewport(nextViewport)
    // if (userInitiated) setDirty(true)
  }

  // async function handleSave() {
  //   const rawWorkflow = toWorkflow(initialDocument.workflow, nodes, edges)
  //   const parsedWorkflow = workflowSchema.safeParse(rawWorkflow)

  //   if (!parsedWorkflow.success) {
  //     setErrors(
  //       parsedWorkflow.error.issues.map(
  //         (issue) => `${issue.path.join('.') || 'workflow'}：${issue.message}`
  //       )
  //     )
  //     return
  //   }

  //   // const validationIssues = validateWorkflow(parsedWorkflow.data, nodeRegistry)

  //   if (validationIssues.length > 0) {
  //     setErrors(validationIssues.map((issue) => issue.message))
  //     return
  //   }

  //   setSaving(true)
  //   setErrors([])

  //   try {
  //     // await onSave({
  //     //   workflow: parsedWorkflow.data,
  //     //   layout: toEditorLayout(nodes, viewport)
  //     // })
  //     setDirty(false)
  //   } catch (error) {
  //     setErrors([error instanceof Error ? error.message : '保存工作流失败'])
  //   } finally {
  //     setSaving(false)
  //   }
  // }

  return (
    <>
      <WorkflowCanvas
        nodes={nodes}
        edges={edges}
        initialViewport={initialDocument.layout.viewport}
        onNodesChange={handleNodesChange}
        onEdgesChange={handleEdgesChange}
        onConnect={handleConnect}
        isValidConnection={(connection) =>
          canConnect(connection, initialDocument.workflow, nodes, edges)
        }
        onNodesDelete={handleNodesDelete}
        onSelectedNodeChange={setSelectedNodeId}
        onViewportChange={handleViewportChange}
      />
    </>
  )
}
