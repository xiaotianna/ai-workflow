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
import { useEffect, useState, type RefObject } from 'react'

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
import { useWorkflowHistory } from './use-workflow-history'
import { useWorkflowLoopEditor } from './use-workflow-loop-editor'
import { getAvailableNodeVariables } from '../utils/get-available-node-variables'
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

// 无论画布内容如何都禁止添加的节点类型
const ALWAYS_DISABLED_NODE_TYPES: ReadonlySet<string> = new Set()
// 整个画布中只允许存在一个实例的节点类型
const SINGLE_INSTANCE_NODE_TYPES: ReadonlySet<string> = new Set([BuiltinNodeType.START])

function getNodePlacementSize(type: string) {
  return type === BuiltinNodeType.LOOP ? DEFAULT_LOOP_SIZE : DEFAULT_NODE_PLACEMENT_SIZE
}

function getDisabledNodeTypes(nodes: readonly WorkflowCanvasNode[]): ReadonlySet<string> {
  const existingNodeTypes = new Set(nodes.map((node) => node.type))
  const existingSingleInstanceNodeTypes = [...SINGLE_INSTANCE_NODE_TYPES].filter((type) =>
    existingNodeTypes.has(type),
  )

  return new Set([...ALWAYS_DISABLED_NODE_TYPES, ...existingSingleInstanceNodeTypes])
}

function isTextEditingTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false

  return Boolean(
    target.closest('input, textarea, select, [contenteditable="true"], [role="textbox"]'),
  )
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

  const history = useWorkflowHistory({
    nodes,
    edges,
    setNodes,
    setEdges,
    onRestore: (snapshot, matchesSavedState) => {
      setSelectedNodeId((currentSelectedNodeId) =>
        currentSelectedNodeId && snapshot.nodes.some((node) => node.id === currentSelectedNodeId)
          ? currentSelectedNodeId
          : undefined,
      )
      setDirty(!matchesSavedState)
      requestAnimationFrame(() => {
        snapshot.nodes.forEach((node) => updateNodeInternals(node.id))
      })
    },
  })

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
  const selectedNodeAvailableVariables = selectedNode
    ? getAvailableNodeVariables({
        nodeId: selectedNode.id,
        nodes: nodes.map(toWorkflowNode),
        edges,
      })
    : []
  const disabledNodeTypes = getDisabledNodeTypes(nodes)

  const { errors, saveWorkflow, saving } = useWorkflowSave({
    baseWorkflow: initialSnapshot.workflow,
    edges,
    nodes,
    onSave,
    onSaved: () => {
      history.markSaved()
      setDirty(false)
    },
    viewport,
  })

  const loopEditor = useWorkflowLoopEditor({
    nodes,
    edges,
    setNodes,
    checkpointHistory: history.checkpoint,
    markDirty: () => setDirty(true),
    updateNodeInternals,
  })

  /** 应用 React Flow 节点变更，并只对可持久化变化设置 dirty */
  function handleNodesChange(changes: NodeChange<WorkflowCanvasNode>[]) {
    const nonSelectionChanges = changes.filter((change) => change.type !== 'select')

    if (nonSelectionChanges.length > 0) {
      if (hasNodeMutation(nonSelectionChanges)) {
        const continuing = nonSelectionChanges.some(
          (change) =>
            (change.type === 'position' && change.dragging === true) ||
            (change.type === 'dimensions' && change.resizing === true),
        )
        const completed =
          !continuing &&
          nonSelectionChanges.some(
            (change) =>
              (change.type === 'position' && change.dragging === false) ||
              (change.type === 'dimensions' && change.resizing === false),
          )

        history.checkpoint({ continuing, completed })
      }
      applyNodeChanges(nonSelectionChanges)
    }

    if (hasNodeMutation(nonSelectionChanges)) setDirty(true)
  }

  // 边变化事件，忽略纯选择态等展示事件
  function handleEdgesChange(changes: EdgeChange<WorkflowEdge>[]) {
    if (hasEdgeMutation(changes)) history.checkpoint()
    applyEdgeChanges(changes)
    if (hasEdgeMutation(changes)) setDirty(true)
  }

  // 使用预设尺寸一次确定新增位置，避免渲染后重新测量导致节点跳动
  function addNode(type: string) {
    if (disabledNodeTypes.has(type)) {
      throw new Error('当前节点类型不可重复添加或已被禁用')
    }

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

    history.checkpoint()
    setNodes((currentNodes) => [...currentNodes, ...createdNodes])
    setDirty(true)
  }

  // 连接事件，需要校验是否能够连接
  function handleConnect(connection: Connection) {
    if (!canConnect(connection, initialSnapshot.workflow, nodes, edges)) return

    const nextEdge = createWorkflowEdge(connection)
    if (!nextEdge) return

    history.checkpoint()
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

    history.checkpoint()
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

    history.checkpoint()
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

  useEffect(() => {
    function handleHistoryShortcut(event: KeyboardEvent) {
      if (event.altKey || (!event.metaKey && !event.ctrlKey) || isTextEditingTarget(event.target)) {
        return
      }

      const key = event.key.toLocaleLowerCase()
      const shouldUndo = key === 'z' && !event.shiftKey
      const shouldRedo = (key === 'z' && event.shiftKey) || (key === 'y' && event.ctrlKey)

      if (shouldUndo && history.canUndo) {
        event.preventDefault()
        history.undo()
      } else if (shouldRedo && history.canRedo) {
        event.preventDefault()
        history.redo()
      }
    }

    globalThis.addEventListener('keydown', handleHistoryShortcut)
    return () => globalThis.removeEventListener('keydown', handleHistoryShortcut)
  }, [history])

  return {
    addNode,
    applyNode,
    availableNodeTypes,
    deleteSelectedNode,
    disabledNodeTypes,
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
    canRedo: history.canRedo,
    canUndo: history.canUndo,
    redo: history.redo,
    saveWorkflow,
    saving,
    selectedNode,
    selectedNodeAvailableVariables,
    selectedNodeDefaultLabel,
    selectedNodeId,
    selectNode,
    loopEditor,
    undo: history.undo,
  }
}
