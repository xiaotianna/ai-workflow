import { nodeRegistry, type WorkflowEdge, type WorkflowNode } from '@ai-workflow/core'
import {
  useEdgesState,
  useNodesState,
  useReactFlow,
  useUpdateNodeInternals,
  type Connection,
  type EdgeChange,
  type NodeChange,
  type OnBeforeDelete,
  type XYPosition,
  type Viewport,
} from '@xyflow/react'
import { useState, type RefObject } from 'react'

import { canConnect } from '@/utils/workflow/can-connect'
import { hasEdgeMutation, hasNodeMutation } from '@/utils/workflow/editor-change'
import {
  collectDescendantNodeIds,
  createCanvasNodes,
  createWorkflowEdge,
  removeDanglingEdges,
  removeEdgesConnectedToNodes,
} from '@/utils/workflow/editor-elements'
import { useWorkflowSave } from './use-workflow-save'
import { useWorkflowLoopEditor } from './use-workflow-loop-editor'
import type { WorkflowCanvasNode, WorkflowEditorSnapshot } from '@/components/workflow/types'
import {
  getDefaultNodePosition,
  toCanvasNodes,
  toWorkflowNode,
} from '@/utils/workflow/editor-transform'
import { ROOT_HIDDEN_NODE_TYPES } from '@/utils/workflow/node-type-visibility'

interface UseWorkflowEditorOptions {
  canvasRef: RefObject<HTMLDivElement | null>
  initialSnapshot: WorkflowEditorSnapshot // 初始化快照数据（包含工作流数据+布局数据）
  onSave: (document: WorkflowEditorSnapshot) => void | Promise<void>
}

const INITIAL_NODE_SIZE = {
  width: 240,
  height: 140,
}
const MAX_NODE_MEASURE_ATTEMPTS = 5

/**
 * 维护 Workflow 编辑会话并向视图暴露明确的状态和操作
 * Hook 必须在 ReactFlowProvider 内调用，因为它会刷新动态 Handle 布局
 */
export function useWorkflowEditor({
  canvasRef,
  initialSnapshot,
  onSave,
}: UseWorkflowEditorOptions) {
  const [nodes, setNodes, applyNodeChanges] = useNodesState<WorkflowCanvasNode>(
    toCanvasNodes(initialSnapshot),
  )
  const [edges, setEdges, applyEdgeChanges] = useEdgesState<WorkflowEdge>([
    ...initialSnapshot.workflow.edges,
  ])
  const [viewport, setViewport] = useState<Viewport | undefined>(initialSnapshot.layout.viewport)
  // 选中的节点id
  const [selectedNodeId, setSelectedNodeId] = useState<string>()
  // 是否有未保存的修改
  const [dirty, setDirty] = useState(false)
  // 当节点的内部结构变了，需要它的端口位置和连线，就调用通知react flow更新
  const updateNodeInternals = useUpdateNodeInternals()
  // 到屏幕中间
  const { getInternalNode, screenToFlowPosition } = useReactFlow<WorkflowCanvasNode, WorkflowEdge>()

  // 画布选中节点
  const selectedCanvasNode = nodes.find((node) => node.id === selectedNodeId)
  // core中的节点数据
  const selectedNode: WorkflowNode | undefined = selectedCanvasNode
    ? toWorkflowNode(selectedCanvasNode)
    : undefined

  const { errors, saveWorkflow, saving } = useWorkflowSave({
    baseWorkflow: initialSnapshot.workflow,
    edges,
    nodes,
    onSave,
    onSaved: () => setDirty(false),
    viewport,
  })

  const loopEditor = useWorkflowLoopEditor({
    nodes,
    edges,
    setNodes,
    setSelectedNodeId,
    markDirty: () => setDirty(true),
    updateNodeInternals,
  })

  /** 应用 React Flow 节点变更，并只对可持久化变化设置 dirty */
  function handleNodesChange(changes: NodeChange<WorkflowCanvasNode>[]) {
    applyNodeChanges(changes)

    if (hasNodeMutation(changes)) setDirty(true)
  }

  // 边变化事件，忽略纯选择态等展示事件
  function handleEdgesChange(changes: EdgeChange<WorkflowEdge>[]) {
    applyEdgeChanges(changes)
    if (hasEdgeMutation(changes)) setDirty(true)
  }

  // 将新节点的实际尺寸中心对齐到用户点击添加时的视口中心
  function centerNodeAfterMeasurement(
    nodeId: string,
    viewportCenter: XYPosition,
    attemptsLeft = MAX_NODE_MEASURE_ATTEMPTS,
  ) {
    requestAnimationFrame(() => {
      const measured = getInternalNode(nodeId)?.measured

      if (!measured?.width || !measured.height) {
        if (attemptsLeft > 1) {
          centerNodeAfterMeasurement(nodeId, viewportCenter, attemptsLeft - 1)
        }
        return
      }

      setNodes((currentNodes) =>
        currentNodes.map((node) =>
          node.id === nodeId
            ? {
                ...node,
                position: {
                  x: viewportCenter.x - measured.width! / 2,
                  y: viewportCenter.y - measured.height! / 2,
                },
              }
            : node,
        ),
      )
    })
  }

  // 使用 Core 初始配置创建节点，并把新节点设为当前选择
  function addNode(type: string) {
    const canvasBounds = canvasRef.current?.getBoundingClientRect()
    const viewportCenter =
      canvasBounds && canvasBounds.width > 0 && canvasBounds.height > 0
        ? screenToFlowPosition({
            x: canvasBounds.left + canvasBounds.width / 2,
            y: canvasBounds.top + canvasBounds.height / 2,
          })
        : undefined
    const createdNodes = createCanvasNodes({
      type,
      position: viewportCenter
        ? {
            x: viewportCenter.x - INITIAL_NODE_SIZE.width / 2,
            y: viewportCenter.y - INITIAL_NODE_SIZE.height / 2,
          }
        : getDefaultNodePosition(nodes.length),
    })
    const nextNode = createdNodes[0]

    setNodes((currentNodes) => [...currentNodes, ...createdNodes])
    setSelectedNodeId(nextNode.id)
    setDirty(true)

    if (viewportCenter) {
      centerNodeAfterMeasurement(nextNode.id, viewportCenter)
    }
  }

  // 连接事件，需要校验是否能够连接
  function handleConnect(connection: Connection) {
    if (!canConnect(connection, initialSnapshot.workflow, nodes, edges)) return

    const nextEdge = createWorkflowEdge(connection)
    if (!nextEdge) return

    setEdges((currentEdges) => [...currentEdges, nextEdge])
    setDirty(true)
  }

  // 校验是否能够连接
  function isValidConnection(connection: Connection | WorkflowEdge) {
    return canConnect(connection, initialSnapshot.workflow, nodes, edges)
  }

  // 删除节点后，同步清理引用这些节点的边和选择态
  function handleNodesDelete(deletedNodes: WorkflowCanvasNode[]) {
    const deletedNodeIds = new Set(deletedNodes.map((node) => node.id))

    setEdges((currentEdges) => removeEdgesConnectedToNodes(currentEdges, deletedNodeIds))

    if (selectedNodeId && deletedNodeIds.has(selectedNodeId)) {
      setSelectedNodeId(undefined)
    }

    setDirty(true)
  }

  // 从删除当前选中节点，并与节点删除一起清理关联边
  function deleteSelectedNode() {
    if (!selectedNodeId) return

    deleteNodes(new Set([selectedNodeId]))
  }

  /**
   * 提交通过 schema 校验的节点配置，清理失效端口边
   * 并通知 React Flow 重新测量动态 Handle
   */
  function applyNodeConfig(nextNode: WorkflowNode) {
    setNodes((currentNodes) =>
      currentNodes.map((canvasNode) =>
        canvasNode.id === nextNode.id
          ? {
              ...canvasNode,
              type: nextNode.type,
              data: {
                config: nextNode.config,
                inputs: nextNode.inputs,
                outputs: nextNode.outputs,
              },
            }
          : canvasNode,
      ),
    )
    setEdges((currentEdges) => removeDanglingEdges(nextNode, currentEdges))
    setDirty(true)

    requestAnimationFrame(() => updateNodeInternals(nextNode.id))
  }

  // 记录最新视口；只有用户主动移动画布时才设置 dirty
  function handleViewportChange(nextViewport: Viewport, userInitiated: boolean) {
    setViewport(nextViewport)
    if (userInitiated) setDirty(true)
  }

  // 设置当前选择的节点
  function selectNode(nodeId: string | undefined) {
    setSelectedNodeId(nodeId)
  }

  // 删除
  function deleteNodes(requestedNodeIds: ReadonlySet<string>) {
    const allowedRootIds = loopEditor.getDeletableRootIds(requestedNodeIds)

    const deletedNodeIds = collectDescendantNodeIds(allowedRootIds, nodes)
    if (deletedNodeIds.size === 0) return

    setNodes((current) => current.filter((node) => !deletedNodeIds.has(node.id)))
    setEdges((current) => removeEdgesConnectedToNodes(current, deletedNodeIds))
    if (selectedNodeId && deletedNodeIds.has(selectedNodeId)) {
      setSelectedNodeId(undefined)
    }
    setDirty(true)
  }

  /**
   * 在 React Flow 真正删除前扩展删除集合。
   * 删除 Loop 时加入全部后代；单独删除 Loop Start/Exit 时拒绝该节点。
   */
  const handleBeforeDelete: OnBeforeDelete<WorkflowCanvasNode, WorkflowEdge> = async ({
    nodes: requestedNodes,
    edges: requestedEdges,
  }) => loopEditor.resolveBeforeDelete(requestedNodes, requestedEdges)

  // 外层画布（非loop内）展示的节点
  const availableNodeTypes = nodeRegistry
    .list()
    .filter((nodeType) => !ROOT_HIDDEN_NODE_TYPES.has(nodeType.definition.type))

  return {
    addNode,
    applyNodeConfig,
    availableNodeTypes,
    deleteSelectedNode,
    dirty,
    edges,
    errors,
    handleBeforeDelete,
    handleConnect,
    handleEdgesChange,
    handleNodesChange,
    handleNodesDelete,
    handleViewportChange,
    initialViewport: initialSnapshot.layout.viewport,
    isValidConnection,
    nodes,
    saveWorkflow,
    saving,
    selectedNode,
    selectedNodeId,
    selectNode,
    loopEditor,
  }
}
