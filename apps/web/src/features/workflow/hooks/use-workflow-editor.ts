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
  useStoreApi,
  useUpdateNodeInternals,
  type Connection,
  type EdgeChange,
  type NodeChange,
  type OnBeforeDelete,
  type Viewport,
} from '@xyflow/react'
import { useRef, useState, type RefObject } from 'react'

import { canConnect } from '@/utils/workflow/can-connect'
import { hasEdgeMutation, hasNodeMutation } from '@/utils/workflow/editor-change'
import {
  collectDescendantNodeIds,
  createCanvasNodes,
  createWorkflowEdge,
  DEFAULT_LOOP_SIZE,
  getCanvasNodeDefaultLabel,
  getLoopNodeSize,
  getSelectionRootNodeIds,
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
import {
  createWorkflowClipboardPayload,
  pasteWorkflowClipboardPayload,
  type WorkflowClipboardPayload,
} from '../utils/editor-clipboard'
import { autoLayoutRootNodes } from '../utils/auto-layout'

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

function getCanvasNodeSize(node: WorkflowCanvasNode) {
  if (node.type === BuiltinNodeType.LOOP) return getLoopNodeSize(node)

  return {
    width:
      node.measured?.width ??
      node.width ??
      (typeof node.style?.width === 'number'
        ? node.style.width
        : DEFAULT_NODE_PLACEMENT_SIZE.width),
    height:
      node.measured?.height ??
      node.height ??
      (typeof node.style?.height === 'number'
        ? node.style.height
        : DEFAULT_NODE_PLACEMENT_SIZE.height),
  }
}

function getDisabledNodeTypes(nodes: readonly WorkflowCanvasNode[]): ReadonlySet<string> {
  const existingNodeTypes = new Set(nodes.map((node) => node.type))
  const existingSingleInstanceNodeTypes = [...SINGLE_INSTANCE_NODE_TYPES].filter((type) =>
    existingNodeTypes.has(type),
  )

  return new Set([...ALWAYS_DISABLED_NODE_TYPES, ...existingSingleInstanceNodeTypes])
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
  const [selectedNodeIds, setSelectedNodeIds] = useState<ReadonlySet<string>>(new Set())
  const [selectedEdgeIds, setSelectedEdgeIds] = useState<ReadonlySet<string>>(new Set())
  // 当前打开配置面板的节点 ID，和画布多选状态分开维护。
  const [selectedNodeId, setSelectedNodeId] = useState<string>()
  // 是否有未保存的修改
  const [dirty, setDirty] = useState(false)
  const clipboardRef = useRef<WorkflowClipboardPayload | undefined>(undefined)
  const clipboardPasteCountRef = useRef(0)
  const nudgeActiveRef = useRef(false)
  // 当节点的内部结构变了，需要它的端口位置和连线，就调用通知react flow更新
  const updateNodeInternals = useUpdateNodeInternals()
  const reactFlowStore = useStoreApi<WorkflowCanvasNode, WorkflowEdge>()
  // 到屏幕中间
  const { fitView, screenToFlowPosition } = useReactFlow<WorkflowCanvasNode, WorkflowEdge>()

  const history = useWorkflowHistory({
    nodes,
    edges,
    setNodes,
    setEdges,
    onRestore: (snapshot, matchesSavedState) => {
      const restoredNodeIds = new Set(snapshot.nodes.map((node) => node.id))
      const restoredEdgeIds = new Set(snapshot.edges.map((edge) => edge.id))

      setSelectedNodeIds(
        (currentSelectedNodeIds) =>
          new Set([...currentSelectedNodeIds].filter((nodeId) => restoredNodeIds.has(nodeId))),
      )
      setSelectedEdgeIds(
        (currentSelectedEdgeIds) =>
          new Set([...currentSelectedEdgeIds].filter((edgeId) => restoredEdgeIds.has(edgeId))),
      )
      setSelectedNodeId((currentSelectedNodeId) =>
        currentSelectedNodeId && restoredNodeIds.has(currentSelectedNodeId)
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
  // 选择态只用于画布交互，不写入 Core 工作流数据。
  const renderedNodes = nodes.map((node) => {
    const selected = selectedNodeIds.has(node.id)

    return Boolean(node.selected) === selected ? node : { ...node, selected }
  })
  const renderedEdges = edges.map((edge) => ({
    ...edge,
    selected: selectedEdgeIds.has(edge.id),
  }))
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
    const selectionChanges = changes.filter((change) => change.type === 'select')
    const nonSelectionChanges = changes.filter((change) => change.type !== 'select')

    if (selectionChanges.length > 0) {
      setSelectedNodeIds((currentSelectedNodeIds) => {
        const nextSelectedNodeIds = new Set(currentSelectedNodeIds)

        for (const change of selectionChanges) {
          if (change.selected) {
            nextSelectedNodeIds.add(change.id)
          } else {
            nextSelectedNodeIds.delete(change.id)
          }
        }

        return nextSelectedNodeIds
      })
    }

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
    const selectionChanges = changes.filter((change) => change.type === 'select')
    const nonSelectionChanges = changes.filter((change) => change.type !== 'select')

    if (selectionChanges.length > 0) {
      setSelectedEdgeIds((currentSelectedEdgeIds) => {
        const nextSelectedEdgeIds = new Set(currentSelectedEdgeIds)

        for (const change of selectionChanges) {
          if (change.selected) {
            nextSelectedEdgeIds.add(change.id)
          } else {
            nextSelectedEdgeIds.delete(change.id)
          }
        }

        return nextSelectedEdgeIds
      })
    }

    if (hasEdgeMutation(nonSelectionChanges)) history.checkpoint()
    if (nonSelectionChanges.length > 0) applyEdgeChanges(nonSelectionChanges)
    if (hasEdgeMutation(nonSelectionChanges)) setDirty(true)
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
    const deletedEdgeIds = new Set(
      edges
        .filter((edge) => deletedNodeIds.has(edge.source) || deletedNodeIds.has(edge.target))
        .map((edge) => edge.id),
    )

    setEdges((currentEdges) => removeEdgesConnectedToNodes(currentEdges, deletedNodeIds))
    setSelectedNodeIds(
      (currentSelectedNodeIds) =>
        new Set([...currentSelectedNodeIds].filter((nodeId) => !deletedNodeIds.has(nodeId))),
    )
    setSelectedEdgeIds(
      (currentSelectedEdgeIds) =>
        new Set([...currentSelectedEdgeIds].filter((edgeId) => !deletedEdgeIds.has(edgeId))),
    )

    if (selectedNodeId && deletedNodeIds.has(selectedNodeId)) {
      setSelectedNodeId(undefined)
    }

    setDirty(true)
  }

  function deleteElements(
    requestedNodeIds: ReadonlySet<string>,
    requestedEdgeIds: ReadonlySet<string> = new Set(),
  ) {
    const allowedRootIds = loopEditor.getDeletableRootIds(requestedNodeIds)
    const deletedNodeIds = collectDescendantNodeIds(allowedRootIds, nodes)
    const deletedEdgeIds = new Set(
      edges
        .filter(
          (edge) =>
            requestedEdgeIds.has(edge.id) ||
            deletedNodeIds.has(edge.source) ||
            deletedNodeIds.has(edge.target),
        )
        .map((edge) => edge.id),
    )

    if (deletedNodeIds.size === 0 && deletedEdgeIds.size === 0) return false

    history.checkpoint()
    setNodes((currentNodes) => currentNodes.filter((node) => !deletedNodeIds.has(node.id)))
    setEdges((currentEdges) => currentEdges.filter((edge) => !deletedEdgeIds.has(edge.id)))
    setSelectedNodeIds(
      (currentSelectedNodeIds) =>
        new Set([...currentSelectedNodeIds].filter((nodeId) => !deletedNodeIds.has(nodeId))),
    )
    setSelectedEdgeIds(
      (currentSelectedEdgeIds) =>
        new Set([...currentSelectedEdgeIds].filter((edgeId) => !deletedEdgeIds.has(edgeId))),
    )

    if (selectedNodeId && deletedNodeIds.has(selectedNodeId)) {
      setSelectedNodeId(undefined)
    }

    setDirty(true)
    return true
  }

  function deleteSelection() {
    return deleteElements(selectedNodeIds, selectedEdgeIds)
  }

  function clearSelection() {
    const hasSelection =
      selectedNodeIds.size > 0 || selectedEdgeIds.size > 0 || selectedNodeId !== undefined

    if (!hasSelection) return false

    setSelectedNodeIds(new Set())
    setSelectedEdgeIds(new Set())
    setSelectedNodeId(undefined)
    return true
  }

  function cancelConnection() {
    const state = reactFlowStore.getState()
    const connectionInProgress =
      state.connection.inProgress || state.connectionClickStartHandle !== null

    if (!connectionInProgress) return false

    state.cancelConnection()
    reactFlowStore.setState({ connectionClickStartHandle: null })
    return true
  }

  function selectAllNodes() {
    const allNodeIds = new Set(nodes.map((node) => node.id))

    setSelectedNodeIds(allNodeIds)
    setSelectedEdgeIds(new Set())
    setSelectedNodeId(undefined)
    return allNodeIds.size > 0
  }

  function createCurrentClipboardPayload() {
    return createWorkflowClipboardPayload(nodes, edges, selectedNodeIds)
  }

  function copySelection() {
    const payload = createCurrentClipboardPayload()
    if (!payload) return false

    clipboardRef.current = payload
    clipboardPasteCountRef.current = 0
    return true
  }

  function pastePayload(payload: WorkflowClipboardPayload, offset: number) {
    const pasted = pasteWorkflowClipboardPayload({
      payload,
      currentNodes: nodes,
      disabledNodeTypes,
      offset,
    })

    if (!pasted) return false

    history.checkpoint()
    setNodes((currentNodes) => [...currentNodes, ...pasted.nodes])
    setEdges((currentEdges) => [...currentEdges, ...pasted.edges])
    setSelectedNodeIds(pasted.selectedNodeIds)
    setSelectedEdgeIds(new Set())
    setSelectedNodeId(undefined)
    setDirty(true)

    requestAnimationFrame(() => {
      pasted.nodes.forEach((node) => updateNodeInternals(node.id))
    })

    return true
  }

  function cutSelection() {
    const payload = createCurrentClipboardPayload()
    if (!payload) return false

    clipboardRef.current = payload
    clipboardPasteCountRef.current = 0
    return deleteElements(new Set(payload.rootNodeIds))
  }

  function pasteSelection() {
    const payload = clipboardRef.current
    if (!payload) return false

    const nextPasteCount = clipboardPasteCountRef.current + 1
    const pasted = pastePayload(payload, nextPasteCount * 32)

    if (pasted) clipboardPasteCountRef.current = nextPasteCount
    return pasted
  }

  function duplicateSelection() {
    const payload = createCurrentClipboardPayload()
    return payload ? pastePayload(payload, 32) : false
  }

  function openNodeConfig(nodeId: string) {
    if (!nodes.some((node) => node.id === nodeId)) return false

    setSelectedNodeId(nodeId)
    return true
  }

  function openSelectedNodeConfig() {
    if (selectedNodeIds.size !== 1) return false

    const nodeId = selectedNodeIds.values().next().value
    return typeof nodeId === 'string' ? openNodeConfig(nodeId) : false
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

  function nudgeSelectedNodes(offset: { x: number; y: number }) {
    const movedNodeIds = getSelectionRootNodeIds(selectedNodeIds, nodes)
    if (movedNodeIds.size === 0) return false

    const nextPositionByNodeId = new Map<string, WorkflowCanvasNode['position']>()

    for (const node of nodes) {
      if (!movedNodeIds.has(node.id)) continue

      let x = node.position.x + offset.x
      let y = node.position.y + offset.y

      if (Array.isArray(node.extent)) {
        const [minimum, maximum] = node.extent
        const size = getCanvasNodeSize(node)
        x = Math.min(Math.max(x, minimum[0]), maximum[0] - size.width)
        y = Math.min(Math.max(y, minimum[1]), maximum[1] - size.height)
      }

      if (x !== node.position.x || y !== node.position.y) {
        nextPositionByNodeId.set(node.id, { x, y })
      }
    }

    if (nextPositionByNodeId.size === 0) return false

    if (!nudgeActiveRef.current) {
      history.checkpoint({ continuing: true })
      nudgeActiveRef.current = true
    }

    setNodes((currentNodes) =>
      currentNodes.map((node) => {
        const position = nextPositionByNodeId.get(node.id)
        return position ? { ...node, position } : node
      }),
    )
    setDirty(true)
    return true
  }

  function finishNodeNudge() {
    if (!nudgeActiveRef.current) return

    history.checkpoint({ completed: true })
    nudgeActiveRef.current = false
  }

  function autoLayout() {
    const layoutedNodes = autoLayoutRootNodes(nodes, edges)
    const layoutChanged = layoutedNodes.some(
      (node, index) =>
        node.position.x !== nodes[index]?.position.x ||
        node.position.y !== nodes[index]?.position.y,
    )

    if (!layoutChanged) return false

    history.checkpoint()
    setNodes(layoutedNodes)
    setDirty(true)
    requestAnimationFrame(() => {
      void fitView({ padding: 0.2, maxZoom: 1, duration: 200 })
    })
    return true
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
    autoLayout,
    availableNodeTypes,
    canRedo: history.canRedo,
    canUndo: history.canUndo,
    cancelConnection,
    clearSelection,
    copySelection,
    cutSelection,
    deleteSelection,
    disabledNodeTypes,
    dirty,
    duplicateSelection,
    edges: renderedEdges,
    errors,
    finishNodeNudge,
    handleBeforeDelete,
    handleConnect,
    handleEdgesChange,
    handleNodesChange,
    handleNodesDelete,
    handleViewportChange,
    initialViewport: initialSnapshot.layout.viewport,
    isValidConnection,
    loopEditor,
    nodes: renderedNodes,
    nudgeSelectedNodes,
    openNodeConfig,
    openSelectedNodeConfig,
    pasteSelection,
    redo: history.redo,
    saveWorkflow,
    saving,
    selectAllNodes,
    selectedNode,
    selectedNodeAvailableVariables,
    selectedNodeDefaultLabel,
    selectedNodeId,
    undo: history.undo,
  }
}
