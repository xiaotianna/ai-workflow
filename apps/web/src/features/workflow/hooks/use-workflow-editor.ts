import {
  BuiltinNodeType,
  nodeRegistry,
  type WorkflowEdge,
  type WorkflowNode,
} from '@ai-workflow/core'
import {
  useEdgesState,
  useNodesState,
  useReactFlow,
  useUpdateNodeInternals,
  type Connection,
  type EdgeChange,
  type NodeChange,
  type OnBeforeDelete,
  type Viewport,
} from '@xyflow/react'
import { useState, type RefObject } from 'react'

import { canConnect } from '@/utils/workflow/can-connect'
import { hasEdgeMutation, hasNodeMutation } from '@/utils/workflow/editor-change'
import {
  collectDescendantNodeIds,
  createCanvasNodes,
  createWorkflowEdge,
  DEFAULT_LOOP_SIZE,
  getCanvasNodeDefaultLabel,
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

const DEFAULT_NODE_PLACEMENT_SIZE = {
  width: 240,
  height: 100,
}

function getNodePlacementSize(type: string) {
  return type === BuiltinNodeType.LOOP ? DEFAULT_LOOP_SIZE : DEFAULT_NODE_PLACEMENT_SIZE
}

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
  const { screenToFlowPosition } = useReactFlow<WorkflowCanvasNode, WorkflowEdge>()

  // 画布选中节点
  const selectedCanvasNode = nodes.find((node) => node.id === selectedNodeId)
  // 节点选中效果只由当前打开的配置面板决定，不接收 React Flow 自身的临时选择态
  const renderedNodes = nodes.map((node) => {
    const selected = node.id === selectedNodeId

    return Boolean(node.selected) === selected ? node : { ...node, selected }
  })
  // core中的节点数据
  const selectedNode: WorkflowNode | undefined = selectedCanvasNode
    ? toWorkflowNode(selectedCanvasNode)
    : undefined
  const selectedNodeDefaultLabel = selectedCanvasNode
    ? getCanvasNodeDefaultLabel(selectedCanvasNode.id, nodes)
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
    markDirty: () => setDirty(true),
    updateNodeInternals,
  })

  /** 应用 React Flow 节点变更，并只对可持久化变化设置 dirty */
  function handleNodesChange(changes: NodeChange<WorkflowCanvasNode>[]) {
    const nonSelectionChanges = changes.filter((change) => change.type !== 'select')

    if (nonSelectionChanges.length > 0) {
      applyNodeChanges(nonSelectionChanges)
    }

    if (hasNodeMutation(nonSelectionChanges)) setDirty(true)
  }

  // 边变化事件，忽略纯选择态等展示事件
  function handleEdgesChange(changes: EdgeChange<WorkflowEdge>[]) {
    applyEdgeChanges(changes)
    if (hasEdgeMutation(changes)) setDirty(true)
  }

  // 使用预设尺寸一次确定新增位置，避免渲染后重新测量导致节点跳动
  function addNode(type: string) {
    const canvasBounds = canvasRef.current?.getBoundingClientRect()
    const viewportCenter =
      canvasBounds && canvasBounds.width > 0 && canvasBounds.height > 0
        ? screenToFlowPosition({
            x: canvasBounds.left + canvasBounds.width / 2,
            y: canvasBounds.top + canvasBounds.height / 2,
          })
        : undefined
    const placementSize = getNodePlacementSize(type)
    const createdNodes = createCanvasNodes({
      type,
      existingNodes: nodes,
      position: viewportCenter
        ? {
            x: viewportCenter.x - placementSize.width / 2,
            y: viewportCenter.y - placementSize.height / 2,
          }
        : getDefaultNodePosition(nodes.length),
    })

    setNodes((currentNodes) => [...currentNodes, ...createdNodes])
    setDirty(true)
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
   * 更新节点实例元信息和通过 schema 校验的配置；配置变化时清理失效端口边，
   * 并通知 React Flow 重新测量动态 Handle。
   */
  function applyNode(nextNode: WorkflowNode) {
    const configChanged = nextNode.config !== selectedNode?.config

    setNodes((currentNodes) =>
      currentNodes.map((canvasNode) =>
        canvasNode.id === nextNode.id
          ? {
              ...canvasNode,
              type: nextNode.type,
              data: {
                label: nextNode.label,
                description: nextNode.description,
                config: nextNode.config,
                inputs: nextNode.inputs,
                outputs: nextNode.outputs,
              },
            }
          : canvasNode,
      ),
    )
    setDirty(true)

    if (configChanged) {
      setEdges((currentEdges) => removeDanglingEdges(nextNode, currentEdges))
      requestAnimationFrame(() => updateNodeInternals(nextNode.id))
    }
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
    applyNode,
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
    nodes: renderedNodes,
    saveWorkflow,
    saving,
    selectedNode,
    selectedNodeDefaultLabel,
    selectedNodeId,
    selectNode,
    loopEditor,
  }
}
