import {
  BuiltinNodeType,
  getNodePorts,
  nodeRegistry,
  type NodeType,
  type WorkflowEdge,
  type WorkflowNode,
} from '@ai-workflow/core'
import { showToast } from '@ai-workflow/ui/lib/toast'
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
  type XYPosition,
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
import { useWorkflowHistory } from './use-workflow-history'
import { useWorkflowLoopEditor } from './use-workflow-loop-editor'
import { getAvailableNodeVariables } from '../utils/get-available-node-variables'
import type { WorkflowCanvasNode, WorkflowEditorSnapshot } from '@/components/workflow/types'
import {
  getDefaultNodePosition,
  toCanvasNodes,
  toWorkflow,
  toWorkflowEditorLayout,
  toWorkflowNode,
} from '@/utils/workflow/editor-transform'
import {
  isLoopSystemNodeType,
  LOOP_UNAVAILABLE_NODE_TYPES,
  ROOT_HIDDEN_NODE_TYPES,
} from '@/utils/workflow/node-type-visibility'
import {
  createWorkflowClipboardPayload,
  pasteWorkflowClipboardPayload,
  type WorkflowClipboardPayload,
} from '../utils/editor-clipboard'
import { autoLayoutRootNodes, layoutInsertedNodeOnEdge } from '../utils/auto-layout'
import { getNextLoopChildPosition } from '../utils/get-next-loop-child-position'

interface UseWorkflowEditorOptions {
  canvasRef: RefObject<HTMLDivElement | null>
  initialSnapshot: WorkflowEditorSnapshot // 初始化快照数据（包含工作流数据+布局数据）
}

const DEFAULT_NODE_PLACEMENT_SIZE = {
  width: 240,
  height: 100,
}

const NEXT_NODE_HORIZONTAL_GAP = 120
const NEXT_NODE_VERTICAL_GAP = 64

// 无论画布内容如何都禁止添加的节点类型
const ALWAYS_DISABLED_NODE_TYPES: ReadonlySet<string> = new Set()
// 整个画布中只允许存在一个实例的节点类型
const SINGLE_INSTANCE_NODE_TYPES: ReadonlySet<string> = new Set([BuiltinNodeType.START])

function canInsertNodeTypeOnEdge(nodeType: NodeType) {
  try {
    const parsedConfig = nodeType.schema.safeParse(nodeType.createInitialConfig())
    if (!parsedConfig.success) return false

    const ports = getNodePorts(nodeType, parsedConfig.data)
    return Object.keys(ports.inputs).length > 0 && Object.keys(ports.outputs).length > 0
  } catch {
    return false
  }
}

function canReceiveConnection(nodeType: NodeType) {
  try {
    const parsedConfig = nodeType.schema.safeParse(nodeType.createInitialConfig())
    if (!parsedConfig.success) return false

    return Object.keys(getNodePorts(nodeType, parsedConfig.data).inputs).length > 0
  } catch {
    return false
  }
}

const EDGE_INSERTION_UNAVAILABLE_NODE_TYPES: ReadonlySet<string> = new Set(
  nodeRegistry
    .list()
    .filter((nodeType) => !canInsertNodeTypeOnEdge(nodeType))
    .map((nodeType) => nodeType.definition.type),
)

const NEXT_NODE_UNAVAILABLE_NODE_TYPES: ReadonlySet<string> = new Set(
  nodeRegistry
    .list()
    .filter((nodeType) => !canReceiveConnection(nodeType))
    .map((nodeType) => nodeType.definition.type),
)

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

function getAvailableOutputPortIds(
  node: WorkflowCanvasNode,
  edges: readonly WorkflowEdge[],
): string[] {
  try {
    const nodeType = nodeRegistry.get(node.type)
    if (!nodeType) return []

    const parsedConfig = nodeType.schema.safeParse(node.data.config)
    if (!parsedConfig.success) return []

    const outputPorts = getNodePorts(nodeType, parsedConfig.data).outputs

    return Object.entries(outputPorts)
      .filter(
        ([portId, port]) =>
          port.multiple === true ||
          !edges.some((edge) => edge.source === node.id && edge.sourceHandle === portId),
      )
      .map(([portId]) => portId)
  } catch {
    return []
  }
}

function findReconnectedEdge(
  edge: WorkflowEdge,
  targetNode: WorkflowCanvasNode,
  nodes: readonly WorkflowCanvasNode[],
  edges: readonly WorkflowEdge[],
  workflow: WorkflowEditorSnapshot['workflow'],
): WorkflowEdge | undefined {
  const targetNodeType = nodeRegistry.get(targetNode.type)
  if (!targetNodeType) return undefined

  const parsedConfig = targetNodeType.schema.safeParse(targetNode.data.config)
  if (!parsedConfig.success) return undefined

  const targetHandleIds = Object.keys(getNodePorts(targetNodeType, parsedConfig.data).inputs)

  for (const targetHandle of targetHandleIds) {
    const candidateEdge = { ...edge, targetHandle }

    if (canConnect(candidateEdge, workflow, nodes, edges)) return candidateEdge
  }

  return undefined
}

function getDisabledNodeTypes(nodes: readonly WorkflowCanvasNode[]): ReadonlySet<string> {
  const existingNodeTypes = new Set(nodes.map((node) => node.type))
  const existingSingleInstanceNodeTypes = [...SINGLE_INSTANCE_NODE_TYPES].filter((type) =>
    existingNodeTypes.has(type),
  )

  return new Set([...ALWAYS_DISABLED_NODE_TYPES, ...existingSingleInstanceNodeTypes])
}

function getBlockedSingleInstanceNodeLabels(
  payload: WorkflowClipboardPayload,
  disabledNodeTypes: ReadonlySet<string>,
) {
  return [
    ...new Set(
      payload.nodes.flatMap((node) => {
        if (!SINGLE_INSTANCE_NODE_TYPES.has(node.type) || !disabledNodeTypes.has(node.type)) {
          return []
        }

        return [nodeRegistry.get(node.type)?.definition.label ?? node.type]
      }),
    ),
  ]
}

function showBlockedSingleInstancePasteToast(nodeLabels: readonly string[]) {
  if (nodeLabels.length === 0) return

  const nodeDescription =
    nodeLabels.length === 1 ? `「${nodeLabels[0]}」节点` : `「${nodeLabels.join('、')}」节点`

  showToast('warning', `画布中只能存在一个${nodeDescription}，已跳过粘贴`)
}

/**
 * 维护 Workflow 编辑会话并向视图暴露明确的状态和操作
 * Hook 必须在 ReactFlowProvider 内调用，因为它会刷新动态 Handle 布局
 */
export function useWorkflowEditor({ canvasRef, initialSnapshot }: UseWorkflowEditorOptions) {
  const [nodes, setNodes, applyNodeChanges] = useNodesState<WorkflowCanvasNode>(
    toCanvasNodes(initialSnapshot),
  )
  const [edges, setEdges, applyEdgeChanges] = useEdgesState<WorkflowEdge>([
    ...initialSnapshot.workflow.edges,
  ])
  const [viewport, setWorkflowViewport] = useState<Viewport | undefined>(
    initialSnapshot.layout.viewport,
  )
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
  const {
    fitView,
    getViewport,
    screenToFlowPosition,
    setViewport: setReactFlowViewport,
  } = useReactFlow<WorkflowCanvasNode, WorkflowEdge>()

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
  const edgeInsertionDisabledNodeTypes = new Set([
    ...disabledNodeTypes,
    ...EDGE_INSERTION_UNAVAILABLE_NODE_TYPES,
  ])

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
  function addNode(type: string, requestedCenter?: XYPosition) {
    if (disabledNodeTypes.has(type)) {
      throw new Error('当前节点类型不可重复添加或已被禁用')
    }

    const canvasBounds = canvasRef.current?.getBoundingClientRect()
    const viewportCenter =
      requestedCenter ??
      (canvasBounds && canvasBounds.width > 0 && canvasBounds.height > 0
        ? screenToFlowPosition({
            x: canvasBounds.left + canvasBounds.width / 2,
            y: canvasBounds.top + canvasBounds.height / 2,
          })
        : undefined)
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

  function getNextNodeTypes(sourceNodeId: string) {
    const sourceNode = nodes.find((node) => node.id === sourceNodeId)

    return sourceNode?.parentId ? loopEditor.availableNodeTypes : availableNodeTypes
  }

  function canAddNextNode(sourceNodeId: string) {
    const sourceNode = nodes.find((node) => node.id === sourceNodeId)

    return Boolean(sourceNode && getAvailableOutputPortIds(sourceNode, edges).length > 0)
  }

  function getNextDisabledNodeTypes(sourceNodeId: string): ReadonlySet<string> {
    const nodeTypes = getNextNodeTypes(sourceNodeId)

    if (!canAddNextNode(sourceNodeId)) {
      return new Set(nodeTypes.map((nodeType) => nodeType.definition.type))
    }

    return new Set([...disabledNodeTypes, ...NEXT_NODE_UNAVAILABLE_NODE_TYPES])
  }

  function addConnectedNode(type: string, sourceNodeId: string) {
    const sourceNode = nodes.find((node) => node.id === sourceNodeId)
    if (!sourceNode) {
      throw new Error('当前节点已不存在')
    }

    if (!getNextNodeTypes(sourceNodeId).some((nodeType) => nodeType.definition.type === type)) {
      throw new Error('当前作用域不支持添加该节点')
    }

    if (getNextDisabledNodeTypes(sourceNodeId).has(type)) {
      throw new Error('所选节点无法连接到当前节点')
    }

    const placementSize = getNodePlacementSize(type)
    const parentLoop = sourceNode.parentId
      ? nodes.find((node) => node.id === sourceNode.parentId && node.type === BuiltinNodeType.LOOP)
      : undefined

    if (sourceNode.parentId && !parentLoop) {
      throw new Error('当前节点所在的 Loop 已不存在')
    }

    const sourceSize = getCanvasNodeSize(sourceNode)
    const connectedTargetNodes = edges
      .filter((edge) => edge.source === sourceNode.id)
      .flatMap((edge) => {
        const targetNode = nodes.find(
          (node) => node.id === edge.target && node.parentId === sourceNode.parentId,
        )

        return targetNode ? [targetNode] : []
      })
    const centeredY =
      sourceNode.position.y + Math.max(0, (sourceSize.height - placementSize.height) / 2)
    const nextRootY = connectedTargetNodes.reduce(
      (nextY, targetNode) =>
        Math.max(
          nextY,
          targetNode.position.y + getCanvasNodeSize(targetNode).height + NEXT_NODE_VERTICAL_GAP,
        ),
      centeredY,
    )
    const position = sourceNode.parentId
      ? getNextLoopChildPosition(sourceNode.parentId, nodes)
      : {
          x: sourceNode.position.x + sourceSize.width + NEXT_NODE_HORIZONTAL_GAP,
          y: nextRootY,
        }
    const createdNodes = createCanvasNodes({
      type,
      existingNodes: nodes,
      position,
      ...(sourceNode.parentId
        ? {
            parentId: sourceNode.parentId,
            parentSize: getLoopNodeSize(parentLoop!),
          }
        : {}),
    })
    const addedNode = createdNodes[0]
    const addedNodeType = nodeRegistry.getOrThrow(addedNode.type)
    const parsedAddedConfig = addedNodeType.schema.safeParse(addedNode.data.config)

    if (!parsedAddedConfig.success) {
      throw new Error('新增节点的配置无效')
    }

    const inputPortIds = Object.keys(getNodePorts(addedNodeType, parsedAddedConfig.data).inputs)
    const outputPortIds = getAvailableOutputPortIds(sourceNode, edges)
    const nextNodes = [...nodes, ...createdNodes]
    let connection: Connection | undefined = undefined

    for (const sourceHandle of outputPortIds) {
      for (const targetHandle of inputPortIds) {
        const candidate: Connection = {
          source: sourceNode.id,
          sourceHandle,
          target: addedNode.id,
          targetHandle,
        }

        if (canConnect(candidate, initialSnapshot.workflow, nextNodes, edges)) {
          connection = candidate
          break
        }
      }

      if (connection) break
    }

    if (!connection) {
      throw new Error('当前节点与所选节点之间没有可用连线')
    }

    const nextEdge = createWorkflowEdge(connection)
    if (!nextEdge) {
      throw new Error('无法创建当前节点到新增节点的连线')
    }

    history.checkpoint()
    setNodes(nextNodes)
    setEdges((currentEdges) => [...currentEdges, nextEdge])
    setDirty(true)

    if (sourceNode.parentId) {
      requestAnimationFrame(() => updateNodeInternals(sourceNode.parentId!))
    }
  }

  function insertNodeOnEdge(type: string, edgeId: string, requestedCenter: XYPosition) {
    if (edgeInsertionDisabledNodeTypes.has(type)) {
      throw new Error('所选节点需要同时提供输入和输出端口')
    }

    const replacedEdge = edges.find((edge) => edge.id === edgeId)
    if (!replacedEdge) {
      throw new Error('当前连线已不存在')
    }

    const sourceNode = nodes.find((node) => node.id === replacedEdge.source)
    const targetNode = nodes.find((node) => node.id === replacedEdge.target)
    if (!sourceNode || !targetNode || sourceNode.parentId || targetNode.parentId) {
      throw new Error('当前连线不支持插入节点')
    }

    const placementSize = getNodePlacementSize(type)
    const createdNodes = createCanvasNodes({
      type,
      existingNodes: nodes,
      position: {
        x: requestedCenter.x - placementSize.width / 2,
        y: requestedCenter.y - placementSize.height / 2,
      },
    })
    const addedNode = createdNodes[0]
    const addedNodeType = nodeRegistry.getOrThrow(addedNode.type)
    const parsedConfig = addedNodeType.schema.safeParse(addedNode.data.config)
    if (!parsedConfig.success) {
      throw new Error('新增节点的配置无效')
    }

    const addedNodePorts = getNodePorts(addedNodeType, parsedConfig.data)
    const inputPortId = Object.keys(addedNodePorts.inputs)[0]
    const outputPortId = Object.keys(addedNodePorts.outputs)[0]
    if (!inputPortId || !outputPortId) {
      throw new Error('所选节点需要同时提供输入和输出端口')
    }

    const nextNodes = [...nodes, ...createdNodes]
    const remainingEdges = edges.filter((edge) => edge.id !== edgeId)
    const incomingConnection: Connection = {
      source: replacedEdge.source,
      sourceHandle: replacedEdge.sourceHandle,
      target: addedNode.id,
      targetHandle: inputPortId,
    }
    if (!canConnect(incomingConnection, initialSnapshot.workflow, nextNodes, remainingEdges)) {
      throw new Error('无法连接原上游节点与新增节点')
    }

    const incomingEdge = createWorkflowEdge(incomingConnection)
    if (!incomingEdge) {
      throw new Error('无法创建新增节点的输入连线')
    }

    const outgoingConnection: Connection = {
      source: addedNode.id,
      sourceHandle: outputPortId,
      target: replacedEdge.target,
      targetHandle: replacedEdge.targetHandle,
    }
    if (
      !canConnect(outgoingConnection, initialSnapshot.workflow, nextNodes, [
        ...remainingEdges,
        incomingEdge,
      ])
    ) {
      throw new Error('无法连接新增节点与原下游节点')
    }

    const outgoingEdge = createWorkflowEdge(outgoingConnection)
    if (!outgoingEdge) {
      throw new Error('无法创建新增节点的输出连线')
    }

    const nextEdges = [...remainingEdges, incomingEdge, outgoingEdge]
    const layoutedNodes = layoutInsertedNodeOnEdge(nextNodes, nextEdges, {
      edgeCenter: requestedCenter,
      insertedNodeId: addedNode.id,
      sourceNodeId: replacedEdge.source,
      targetNodeId: replacedEdge.target,
    })

    history.checkpoint()
    setNodes(layoutedNodes)
    setEdges(nextEdges)
    setSelectedEdgeIds(
      (currentSelectedEdgeIds) =>
        new Set([...currentSelectedEdgeIds].filter((selectedId) => selectedId !== edgeId)),
    )
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

  function createNodeClipboardPayload(nodeId: string) {
    return createWorkflowClipboardPayload(nodes, edges, new Set([nodeId]))
  }

  function copySelection() {
    const payload = createCurrentClipboardPayload()
    if (!payload) return false

    clipboardRef.current = payload
    clipboardPasteCountRef.current = 0
    return true
  }

  function copyNode(nodeId: string) {
    const payload = createNodeClipboardPayload(nodeId)
    if (!payload) return false

    clipboardRef.current = payload
    clipboardPasteCountRef.current = 0
    return true
  }

  function pastePayload(
    payload: WorkflowClipboardPayload,
    offset: number | XYPosition,
    options: { notifyBlockedSingleInstance?: boolean } = {},
  ) {
    if (options.notifyBlockedSingleInstance) {
      showBlockedSingleInstancePasteToast(
        getBlockedSingleInstanceNodeLabels(payload, disabledNodeTypes),
      )
    }

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
    const pasted = pastePayload(payload, nextPasteCount * 32, {
      notifyBlockedSingleInstance: true,
    })

    if (pasted) clipboardPasteCountRef.current = nextPasteCount
    return pasted
  }

  function pasteSelectionAt(position: XYPosition) {
    const payload = clipboardRef.current
    return payload ? pastePayload(payload, position, { notifyBlockedSingleInstance: true }) : false
  }

  function duplicateSelection() {
    const payload = createCurrentClipboardPayload()
    return payload ? pastePayload(payload, 32) : false
  }

  function duplicateNode(nodeId: string) {
    const payload = createNodeClipboardPayload(nodeId)
    return payload ? pastePayload(payload, 32) : false
  }

  function deleteNode(nodeId: string) {
    return deleteElements(new Set([nodeId]))
  }

  function disconnectNodes(sourceNodeId: string, targetNodeId: string) {
    const connectedEdgeIds = new Set(
      edges
        .filter((edge) => edge.source === sourceNodeId && edge.target === targetNodeId)
        .map((edge) => edge.id),
    )

    return deleteElements(new Set(), connectedEdgeIds)
  }

  function selectNodeForContextMenu(nodeId: string) {
    if (!nodes.some((node) => node.id === nodeId)) return false

    setSelectedNodeIds(new Set([nodeId]))
    setSelectedEdgeIds(new Set())
    return true
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

  function getReplacementNodeTypes(nodeId: string) {
    const node = nodes.find((candidate) => candidate.id === nodeId)

    if (!node || isLoopSystemNodeType(node.type)) return []

    const unavailableNodeTypes = node.parentId
      ? LOOP_UNAVAILABLE_NODE_TYPES
      : ROOT_HIDDEN_NODE_TYPES

    return nodeRegistry
      .list()
      .filter((nodeType) => !unavailableNodeTypes.has(nodeType.definition.type))
  }

  function getReplacementDisabledNodeTypes(nodeId: string): ReadonlySet<string> {
    const node = nodes.find((candidate) => candidate.id === nodeId)
    if (!node) return new Set()

    const removedNodeIds = collectDescendantNodeIds(new Set([nodeId]), nodes)
    const remainingNodes = nodes.filter((candidate) => !removedNodeIds.has(candidate.id))

    return new Set([...getDisabledNodeTypes(remainingNodes), node.type])
  }

  function getConnectedReplacementDisabledNodeTypes(nodeId: string): ReadonlySet<string> {
    return new Set([
      ...getReplacementDisabledNodeTypes(nodeId),
      ...NEXT_NODE_UNAVAILABLE_NODE_TYPES,
    ])
  }

  function canReplaceNode(nodeId: string) {
    const disabledTypes = getReplacementDisabledNodeTypes(nodeId)

    return getReplacementNodeTypes(nodeId).some(
      ({ definition }) => !disabledTypes.has(definition.type),
    )
  }

  function canReplaceConnectedNode(sourceNodeId: string, nodeId: string) {
    if (!edges.some((edge) => edge.source === sourceNodeId && edge.target === nodeId)) return false

    const disabledTypes = getConnectedReplacementDisabledNodeTypes(nodeId)

    return getReplacementNodeTypes(nodeId).some(
      ({ definition }) => !disabledTypes.has(definition.type),
    )
  }

  /**
   * 原位更换节点。根节点 ID 和位置保持不变，以便端口仍兼容时复用既有连线；
   * 配置、变量和容器子节点全部按新类型重新初始化。
   */
  function replaceNodeByType(nodeId: string, type: string, connectionSourceNodeId?: string) {
    const currentNode = nodes.find((node) => node.id === nodeId)
    const availableTypes = getReplacementNodeTypes(nodeId)
    const disabledTypes = connectionSourceNodeId
      ? getConnectedReplacementDisabledNodeTypes(nodeId)
      : getReplacementDisabledNodeTypes(nodeId)

    if (!currentNode || !availableTypes.some(({ definition }) => definition.type === type)) {
      throw new Error('当前节点不可更换为所选类型')
    }

    if (disabledTypes.has(type)) {
      throw new Error('所选节点类型不可重复添加、已被禁用或与当前类型相同')
    }

    const removedNodeIds = collectDescendantNodeIds(new Set([nodeId]), nodes)
    const removedDescendantNodeIds = new Set(
      [...removedNodeIds].filter((removedNodeId) => removedNodeId !== nodeId),
    )
    const remainingNodes = nodes.filter((node) => !removedNodeIds.has(node.id))
    const parentNode = currentNode.parentId
      ? remainingNodes.find((node) => node.id === currentNode.parentId)
      : undefined
    const createdNodes = createCanvasNodes({
      type,
      existingNodes: remainingNodes,
      position: currentNode.position,
      ...(currentNode.parentId
        ? {
            parentId: currentNode.parentId,
            ...(parentNode ? { parentSize: getCanvasNodeSize(parentNode) } : {}),
          }
        : {}),
    })
    const [createdRootNode, ...createdDescendants] = createdNodes
    const nextRootNode: WorkflowCanvasNode = {
      ...createdRootNode,
      id: nodeId,
      position: currentNode.position,
    }
    const nextDescendants: WorkflowCanvasNode[] = []

    for (const node of createdDescendants) {
      nextDescendants.push(
        node.parentId === createdRootNode.id ? { ...node, parentId: nodeId } : node,
      )
    }
    const remainingEdges = edges.filter(
      (edge) =>
        !removedDescendantNodeIds.has(edge.source) && !removedDescendantNodeIds.has(edge.target),
    )
    const nextNodes = nodes.flatMap((node) =>
      node.id === nodeId
        ? [nextRootNode, ...nextDescendants]
        : removedNodeIds.has(node.id)
          ? []
          : [node],
    )
    let nextEdges = removeDanglingEdges(toWorkflowNode(nextRootNode), remainingEdges)

    if (connectionSourceNodeId) {
      const connectedEdges = remainingEdges.filter(
        (edge) => edge.source === connectionSourceNodeId && edge.target === nodeId,
      )
      const connectedEdge = connectedEdges[0]

      if (!connectedEdge) {
        throw new Error('当前节点与待更改节点之间的连接已不存在')
      }

      const connectedEdgeIds = new Set(connectedEdges.map((edge) => edge.id))
      const disconnectedEdges = remainingEdges.filter((edge) => !connectedEdgeIds.has(edge.id))
      const validDisconnectedEdges = removeDanglingEdges(
        toWorkflowNode(nextRootNode),
        disconnectedEdges,
      )
      const reconnectedEdge = findReconnectedEdge(
        connectedEdge,
        nextRootNode,
        nextNodes,
        validDisconnectedEdges,
        initialSnapshot.workflow,
      )

      if (!reconnectedEdge) {
        throw new Error('所选节点无法保持当前连接')
      }

      const nextEdgesById = new Map(validDisconnectedEdges.map((edge) => [edge.id, edge]))
      nextEdgesById.set(connectedEdge.id, reconnectedEdge)

      nextEdges = remainingEdges.flatMap((edge) => {
        const nextEdge = nextEdgesById.get(edge.id)
        return nextEdge ? [nextEdge] : []
      })
    }

    const nextEdgeIds = new Set(nextEdges.map((edge) => edge.id))
    const currentViewport = getViewport()

    history.checkpoint()
    setNodes(nextNodes)
    setEdges(nextEdges)
    setSelectedNodeIds((currentSelectedNodeIds) => {
      const nextSelectedNodeIds = new Set(
        [...currentSelectedNodeIds].filter(
          (selectedId) => selectedId === nodeId || !removedNodeIds.has(selectedId),
        ),
      )

      nextSelectedNodeIds.add(nodeId)
      return nextSelectedNodeIds
    })
    setSelectedEdgeIds(
      (currentSelectedEdgeIds) =>
        new Set([...currentSelectedEdgeIds].filter((edgeId) => nextEdgeIds.has(edgeId))),
    )

    if (selectedNodeId && removedNodeIds.has(selectedNodeId)) {
      setSelectedNodeId(undefined)
    }

    setDirty(true)
    requestAnimationFrame(() => {
      for (const node of [nextRootNode, ...nextDescendants]) {
        updateNodeInternals(node.id)
      }

      // 节点类型重建或浮层回收焦点都不能改变用户当前观察位置。
      void setReactFlowViewport(currentViewport)
    })
    return true
  }

  function replaceNode(nodeId: string, type: string) {
    return replaceNodeByType(nodeId, type)
  }

  function replaceConnectedNode(sourceNodeId: string, nodeId: string, type: string) {
    return replaceNodeByType(nodeId, type, sourceNodeId)
  }

  function createSnapshot(): WorkflowEditorSnapshot {
    return {
      workflow: toWorkflow(initialSnapshot.workflow, nodes, edges),
      layout: toWorkflowEditorLayout(nodes, viewport),
    }
  }

  function markSaved() {
    history.markSaved()
    setDirty(false)
  }

  function replaceCanvas(snapshot: WorkflowEditorSnapshot) {
    const importedWorkflow = {
      ...initialSnapshot.workflow,
      nodes: snapshot.workflow.nodes,
      edges: snapshot.workflow.edges,
    }
    const nextSnapshot = {
      workflow: importedWorkflow,
      layout: snapshot.layout,
    }
    const nextNodes = toCanvasNodes(nextSnapshot)

    history.checkpoint()
    setNodes(nextNodes)
    setEdges([...importedWorkflow.edges])
    setSelectedNodeIds(new Set())
    setSelectedEdgeIds(new Set())
    setSelectedNodeId(undefined)
    setWorkflowViewport(snapshot.layout.viewport)
    setDirty(true)

    requestAnimationFrame(() => {
      nextNodes.forEach((node) => updateNodeInternals(node.id))

      if (snapshot.layout.viewport) {
        void setReactFlowViewport(snapshot.layout.viewport)
      } else {
        void fitView({ padding: 0.2, maxZoom: 1, duration: 200 })
      }
    })
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
    addConnectedNode,
    addNode,
    applyNode,
    autoLayout,
    availableNodeTypes,
    canAddNextNode,
    canRedo: history.canRedo,
    canUndo: history.canUndo,
    cancelConnection,
    clearSelection,
    canCopyNode: (nodeId: string) => Boolean(createNodeClipboardPayload(nodeId)),
    canDeleteNode: (nodeId: string) =>
      loopEditor.getDeletableRootIds(new Set([nodeId])).has(nodeId),
    canDuplicateNode: (nodeId: string) => {
      const node = nodes.find((candidate) => candidate.id === nodeId)
      return Boolean(node && !isLoopSystemNodeType(node.type) && !disabledNodeTypes.has(node.type))
    },
    canPaste: clipboardRef.current !== undefined,
    canReplaceConnectedNode,
    canReplaceNode,
    canRunNode: (nodeId: string) => {
      const node = nodes.find((candidate) => candidate.id === nodeId)
      return Boolean(node && !isLoopSystemNodeType(node.type))
    },
    copyNode,
    copySelection,
    createSnapshot,
    cutSelection,
    deleteNode,
    deleteSelection,
    disconnectNodes,
    disabledNodeTypes,
    dirty,
    duplicateNode,
    duplicateSelection,
    edgeInsertionDisabledNodeTypes,
    edges: renderedEdges,
    finishNodeNudge,
    getNextDisabledNodeTypes,
    getNextNodeTypes,
    getConnectedReplacementDisabledNodeTypes,
    getReplacementDisabledNodeTypes,
    getReplacementNodeTypes,
    handleBeforeDelete,
    handleConnect,
    handleEdgesChange,
    handleNodesChange,
    handleNodesDelete,
    initialViewport: initialSnapshot.layout.viewport,
    insertNodeOnEdge,
    isValidConnection,
    loopEditor,
    markSaved,
    nodes: renderedNodes,
    nudgeSelectedNodes,
    openNodeConfig,
    openSelectedNodeConfig,
    pasteSelection,
    pasteSelectionAt,
    replaceCanvas,
    replaceConnectedNode,
    replaceNode,
    redo: history.redo,
    selectAllNodes,
    selectNodeForContextMenu,
    selectedNode,
    selectedNodeAvailableVariables,
    selectedNodeDefaultLabel,
    selectedNodeId,
    undo: history.undo,
  }
}
