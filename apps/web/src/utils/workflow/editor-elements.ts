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
import type { Connection, XYPosition } from '@xyflow/react'

// 创建节点（调用core的createInitialConfig工厂函数）
export const createCanvasNode = (type: string, position: XYPosition): WorkflowCanvasNode => {
  const nodeType = nodeRegistry.getOrThrow(type)
  return {
    id: generateUuid(),
    type: nodeType.definition.type,
    position,
    data: {
      config: nodeType.createInitialConfig(),
      inputs: {},
      outputs: [],
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
const DEFAULT_LOOP_SIZE = {
  width: 680,
  height: 420,
}

/**
 * 创建loop画布节点
 * 必须一次生成三个节点，避免产生暂时不合法的 Loop
 */
export const createLoopCanvasNodes = ({
  position,
  parentId,
}: {
  position: XYPosition
  parentId?: string
}): WorkflowCanvasNode[] => {
  const loopId = generateUuid()

  // 创建loop节点
  const loopNode: WorkflowCanvasNode = {
    id: loopId,
    type: BuiltinNodeType.LOOP,
    position,
    data: {
      config: nodeRegistry.getOrThrow(BuiltinNodeType.LOOP).createInitialConfig(),
      inputs: {},
      outputs: [],
    },
    ...(parentId
      ? {
          parentId,
          extent: 'parent',
          expandParent: true,
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
    extent: 'parent',
    position: {
      x: 32,
      y: 96,
    },
    data: {
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
    extent: 'parent',
    position: {
      x: 260,
      y: 96,
    },
    data: {
      config: nodeRegistry.getOrThrow(BuiltinNodeType.LOOP_EXIT).createInitialConfig(),
      inputs: {},
      outputs: [],
    },
  }

  return [loopNode, loopStartNode, loopExitNode]
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
