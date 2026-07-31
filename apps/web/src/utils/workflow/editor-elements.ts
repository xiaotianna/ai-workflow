/**
 * 负责工作流节点、边的创建和删除，只接收参数并返回新的数据
 */

import type { WorkflowCanvasNode } from '@/components/workflow/types'
import {
  BuiltinNodeType,
  getNodePorts,
  nodeRegistry,
  type WorkflowEdge,
  type WorkflowNode,
} from '@ai-workflow/core'
import { generateUuid } from '@ai-workflow/shared/utils/uuid'
import type { Connection, CoordinateExtent, XYPosition } from '@xyflow/react'

function getNodeLabelIndex(label: string, defaultLabel: string): number | undefined {
  if (label === defaultLabel) {
    return 1
  }

  const numberedLabelPrefix = `${defaultLabel} `

  if (!label.startsWith(numberedLabelPrefix)) {
    return undefined
  }

  const suffix = label.slice(numberedLabelPrefix.length)
  const index = Number(suffix)

  return Number.isSafeInteger(index) && index >= 2 && String(index) === suffix ? index : undefined
}

function formatNodeDefaultLabel(defaultLabel: string, index: number): string {
  return index > 1 ? `${defaultLabel} ${index}` : defaultLabel
}

/**
 * 获取节点实例清空自定义名称后应恢复的默认名称。
 * 优先保留创建时已生成的标准编号；旧节点没有编号时按同类型节点顺序推导。
 */
export function getCanvasNodeDefaultLabel(
  nodeId: string,
  nodes: readonly WorkflowCanvasNode[],
): string | undefined {
  const node = nodes.find((candidate) => candidate.id === nodeId)

  if (!node) {
    return undefined
  }

  const nodeType = nodeRegistry.get(node.type)

  if (!nodeType) {
    return node.data.label ?? node.type
  }

  const defaultLabel = nodeType.definition.label
  const sameTypeNodes = nodes.filter((candidate) => candidate.type === node.type)
  const ordinal = sameTypeNodes.findIndex((candidate) => candidate.id === nodeId) + 1
  const storedLabelIndex = node.data.label
    ? getNodeLabelIndex(node.data.label, defaultLabel)
    : undefined
  const defaultLabelIndex =
    storedLabelIndex !== undefined && storedLabelIndex > 1 ? storedLabelIndex : ordinal

  return formatNodeDefaultLabel(defaultLabel, defaultLabelIndex)
}

/**
 * 同类型首个节点沿用类型默认名称，后续实例使用“默认名称 2”“默认名称 3”。
 * 同时参考实例数量和已使用的最大编号，避免删除或自定义名称后生成重复编号。
 */
function getNextNodeLabel(
  type: string,
  existingNodes: readonly WorkflowCanvasNode[],
): string | undefined {
  const defaultLabel = nodeRegistry.getOrThrow(type).definition.label
  const sameTypeNodes = existingNodes.filter((node) => node.type === type)

  if (sameTypeNodes.length === 0) {
    return undefined
  }

  const maxUsedIndex = sameTypeNodes.reduce((maxIndex, node) => {
    const labelIndex = getNodeLabelIndex(node.data.label ?? defaultLabel, defaultLabel)

    return labelIndex === undefined ? maxIndex : Math.max(maxIndex, labelIndex)
  }, 0)
  const nextIndex = Math.max(sameTypeNodes.length + 1, maxUsedIndex + 1)

  return formatNodeDefaultLabel(defaultLabel, nextIndex)
}

// 创建单个普通节点（调用core的createInitialConfig工厂函数）
const createCanvasNode = (
  type: string,
  position: XYPosition,
  existingNodes: readonly WorkflowCanvasNode[],
): WorkflowCanvasNode => {
  const nodeType = nodeRegistry.getOrThrow(type)
  const label = getNextNodeLabel(type, existingNodes)
  const inputs = nodeType.createInitialInputs?.() ?? {}
  const outputs = nodeType.createInitialOutputs?.() ?? []

  return {
    id: generateUuid(),
    type: nodeType.definition.type,
    position,
    data: {
      ...(label ? { label } : {}),
      config: nodeType.createInitialConfig({ inputs, outputs }),
      inputs,
      outputs,
    },
  }
}

// 把react flow的connection转为core中的边
export const createWorkflowEdge = (connection: Connection): WorkflowEdge | undefined => {
  const { source, sourceHandle, target, targetHandle } = connection
  if (!sourceHandle || !targetHandle) return undefined
  return {
    id: generateUuid(),
    // 起点节点id
    source,
    // 起点端口的id
    sourceHandle,
    // 终点节点id
    target,
    // 终点端口的id
    targetHandle,
  }
}

// 删除节点时，把与这些节点相连的边也一起删除
export const removeEdgesConnectedToNodes = (
  edges: readonly WorkflowEdge[],
  nodeIds: ReadonlySet<string>,
): WorkflowEdge[] => {
  // 过滤掉与 nodeIds 中任意节点相连的边
  return edges.filter((edge) => !nodeIds.has(edge.source) && !nodeIds.has(edge.target))
}

//
/**
 * 节点还存在，只删除连接到已消失端口的边，
 * 也就是节点配置变化后，如果某些端口消失了，就删除连接到这些旧端口的边
 */
export const removeDanglingEdges = (
  node: WorkflowNode,
  edges: readonly WorkflowEdge[],
): WorkflowEdge[] => {
  // 找到该节点，如果节点不存在，不处理边
  const nodeType = nodeRegistry.get(node.type)
  if (!nodeType) return [...edges]

  // 检查节点的schema配置是否合法，不符合不处理边
  const parsedConfig = nodeType.schema.safeParse(node.config)
  if (!parsedConfig.success) return [...edges]

  // 动态计算当前node节点类型的端口
  const ports = getNodePorts(nodeType, parsedConfig.data)
  return edges.filter((edge) => {
    // 这条边从当前节点出发，但它引用的输出端口已经不存在
    if (edge.source === node.id && !ports.outputs[edge.sourceHandle]) return false
    // 这条边连接到当前节点，但它引用的输入端口已经不存在
    if (edge.target === node.id && !ports.inputs[edge.targetHandle]) return false
    return true
  })
}

// 默认loop容器大小
export const DEFAULT_LOOP_SIZE = {
  width: 680,
  height: 420,
}

const LOOP_CONTENT_INSET = {
  top: 48,
  right: 12,
  bottom: 12,
  left: 12,
}

const LOOP_CHILD_PADDING = 20

// Loop 子节点只允许出现在点阵背景的安全边距内。
export const getLoopChildExtent = ({
  width,
  height,
}: {
  width: number
  height: number
}): CoordinateExtent => [
  [LOOP_CONTENT_INSET.left + LOOP_CHILD_PADDING, LOOP_CONTENT_INSET.top + LOOP_CHILD_PADDING],
  [
    width - LOOP_CONTENT_INSET.right - LOOP_CHILD_PADDING,
    height - LOOP_CONTENT_INSET.bottom - LOOP_CHILD_PADDING,
  ],
]

export function getLoopNodeSize(node: WorkflowCanvasNode) {
  return {
    width:
      node.measured?.width ??
      (typeof node.style?.width === 'number' ? node.style.width : DEFAULT_LOOP_SIZE.width),
    height:
      node.measured?.height ??
      (typeof node.style?.height === 'number' ? node.style.height : DEFAULT_LOOP_SIZE.height),
  }
}

/** Loop 容器尺寸变化后，同步更新其内部子节点的可拖拽范围。 */
export function syncLoopChildExtents(nodes: WorkflowCanvasNode[]) {
  const loopSizeById = new Map(
    nodes
      .filter((node) => node.type === BuiltinNodeType.LOOP)
      .map((node) => [node.id, getLoopNodeSize(node)]),
  )

  return nodes.map((node) =>
    node.parentId && loopSizeById.has(node.parentId)
      ? {
          ...node,
          extent: getLoopChildExtent(loopSizeById.get(node.parentId)!),
        }
      : node,
  )
}

/**
 * 创建loop画布节点
 * 必须一次生成三个节点，避免产生暂时不合法的 Loop
 */
const createLoopCanvasNodes = ({
  position,
  parentId,
  parentSize,
  existingNodes,
}: {
  position: XYPosition
  parentId?: string
  parentSize?: { width: number; height: number }
  existingNodes: readonly WorkflowCanvasNode[]
}): [WorkflowCanvasNode, WorkflowCanvasNode, WorkflowCanvasNode] => {
  const loopId = generateUuid()
  const loopChildExtent = getLoopChildExtent(DEFAULT_LOOP_SIZE)
  const loopLabel = getNextNodeLabel(BuiltinNodeType.LOOP, existingNodes)
  const loopStartLabel = getNextNodeLabel(BuiltinNodeType.LOOP_START, existingNodes)
  const loopExitLabel = getNextNodeLabel(BuiltinNodeType.LOOP_EXIT, existingNodes)

  // 创建loop节点
  const loopNode: WorkflowCanvasNode = {
    id: loopId,
    type: BuiltinNodeType.LOOP,
    position,
    data: {
      ...(loopLabel ? { label: loopLabel } : {}),
      config: nodeRegistry.getOrThrow(BuiltinNodeType.LOOP).createInitialConfig(),
      inputs: {},
      outputs: [],
    },
    ...(parentId
      ? {
          parentId,
          extent: getLoopChildExtent(parentSize ?? DEFAULT_LOOP_SIZE),
        }
      : {}),
    style: DEFAULT_LOOP_SIZE,
    dragHandle: '.drag-handle',
  }

  // 创建loop的子开始节点
  const loopStartNode: WorkflowCanvasNode = {
    id: generateUuid(),
    type: BuiltinNodeType.LOOP_START,
    parentId: loopId,
    extent: loopChildExtent,
    deletable: false,
    position: {
      x: 32,
      y: 96,
    },
    data: {
      ...(loopStartLabel ? { label: loopStartLabel } : {}),
      config: nodeRegistry.getOrThrow(BuiltinNodeType.LOOP_START).createInitialConfig(),
      inputs: {},
      outputs: [],
    },
  }

  // 创建loop的子退出节点
  const loopExitNode: WorkflowCanvasNode = {
    id: generateUuid(),
    type: BuiltinNodeType.LOOP_EXIT,
    parentId: loopId,
    extent: loopChildExtent,
    deletable: false,
    position: {
      x: 260,
      y: 96,
    },
    data: {
      ...(loopExitLabel ? { label: loopExitLabel } : {}),
      config: nodeRegistry.getOrThrow(BuiltinNodeType.LOOP_EXIT).createInitialConfig(),
      inputs: {},
      outputs: [],
    },
  }

  return [loopNode, loopStartNode, loopExitNode]
}

/**
 * 创建可直接加入画布的完整节点集合。
 * Loop 始终原子生成容器、Loop Start 与 Loop Exit，普通节点只生成一个。
 */
export const createCanvasNodes = ({
  type,
  position,
  parentId,
  parentSize,
  existingNodes,
}: {
  type: string
  position: XYPosition
  parentId?: string
  parentSize?: { width: number; height: number }
  existingNodes: readonly WorkflowCanvasNode[]
}): [WorkflowCanvasNode, ...WorkflowCanvasNode[]] => {
  if (type === BuiltinNodeType.LOOP) {
    return createLoopCanvasNodes({ position, parentId, parentSize, existingNodes })
  }

  const node = createCanvasNode(type, position, existingNodes)

  if (!parentId) {
    return [node]
  }

  return [
    {
      ...node,
      parentId,
      extent: getLoopChildExtent(parentSize ?? DEFAULT_LOOP_SIZE),
    },
  ]
}

// 删除节点（删除 Loop 时必须递归删除全部后代节点）
export const collectDescendantNodeIds = (
  rootNodeIds: ReadonlySet<string>,
  nodes: readonly WorkflowCanvasNode[],
): Set<string> => {
  const result = new Set(rootNodeIds)
  let changed = true

  while (changed) {
    changed = false

    for (const node of nodes) {
      if (node.parentId && result.has(node.parentId) && !result.has(node.id)) {
        result.add(node.id)
        changed = true
      }
    }
  }

  return result
}

/**
 * 从选择集合中移除已有选中祖先的节点，避免移动、复制父容器时重复处理其后代。
 */
export const getSelectionRootNodeIds = (
  selectedNodeIds: ReadonlySet<string>,
  nodes: readonly WorkflowCanvasNode[],
): Set<string> => {
  const nodeById = new Map(nodes.map((node) => [node.id, node]))

  return new Set(
    nodes
      .filter((node) => {
        if (!selectedNodeIds.has(node.id)) return false

        let parentId = node.parentId

        while (parentId) {
          if (selectedNodeIds.has(parentId)) return false
          parentId = nodeById.get(parentId)?.parentId
        }

        return true
      })
      .map((node) => node.id),
  )
}
