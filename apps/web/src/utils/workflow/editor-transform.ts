import type { WorkflowCanvasNode, WorkflowEditorSnapshot } from '@/components/workflow/types'
import {
  BuiltinNodeType,
  type Workflow,
  type WorkflowEdge,
  type WorkflowNode,
} from '@ai-workflow/core'
import type { Viewport, XYPosition } from '@xyflow/react'
import { DEFAULT_LOOP_SIZE, getLoopChildExtent } from './editor-elements'
import { isLoopSystemNodeType } from './node-type-visibility'

// 提供默认节点位置
export const getDefaultNodePosition = (index: number): XYPosition => {
  return {
    x: 120 + (index % 3) * 320,
    y: 120 + Math.floor(index / 3) * 220,
  }
}

// 计算节点在嵌套关系中的层级，确保传给 React Flow 时，父节点排在子节点前面。
const getNodeDepth = (node: WorkflowNode, nodeById: ReadonlyMap<string, WorkflowNode>): number => {
  let depth = 0
  let parentId = node.parentId
  const visited = new Set<string>()

  while (parentId && !visited.has(parentId)) {
    visited.add(parentId)
    depth += 1
    parentId = nodeById.get(parentId)?.parentId
  }

  return depth
}

// 将core的工作流数据转为画布需要的数据（添加坐标）
export const toCanvasNodes = (snapshot: WorkflowEditorSnapshot): WorkflowCanvasNode[] => {
  // 建立节点索引
  const nodeById = new Map(snapshot.workflow.nodes.map((node) => [node.id, node]))
  const loopSizeById = new Map(
    snapshot.workflow.nodes
      .filter((node) => node.type === BuiltinNodeType.LOOP)
      .map((node) => [node.id, snapshot.layout.sizes?.[node.id] ?? DEFAULT_LOOP_SIZE]),
  )

  return (
    [...snapshot.workflow.nodes]
      // 按父子层级排序(外层 Loop -> 内层 Loop -> 内层 Loop 的子节点)
      .sort((left, right) => getNodeDepth(left, nodeById) - getNodeDepth(right, nodeById))
      .map((workflowNode, index) => {
        const size = snapshot.layout.sizes?.[workflowNode.id]

        return {
          id: workflowNode.id,
          type: workflowNode.type,
          position: snapshot.layout.positions[workflowNode.id] ?? getDefaultNodePosition(index),
          data: {
            config: workflowNode.config,
            inputs: workflowNode.inputs,
            outputs: workflowNode.outputs,
          },
          parentId: workflowNode.parentId,
          // 子节点只能在父 Loop 的点阵背景区域内移动。
          extent: workflowNode.parentId
            ? getLoopChildExtent(loopSizeById.get(workflowNode.parentId) ?? DEFAULT_LOOP_SIZE)
            : undefined,
          // Loop Start/Exit 是容器自动维护的系统节点，不能单独删除。
          deletable: !isLoopSystemNodeType(workflowNode.type),
          // Loop 只允许通过 Header 拖动，避免操作内部节点时带动容器。
          dragHandle: workflowNode.type === BuiltinNodeType.LOOP ? '.drag-handle' : undefined,
          // 保存loop容器尺寸
          ...(size
            ? {
                style: {
                  width: size.width,
                  height: size.height,
                },
              }
            : {}),
        }
      })
  )
}

// 把画布数据转为core中节点数据（去掉坐标，node->node）
export const toWorkflowNode = (node: WorkflowCanvasNode): WorkflowNode => {
  return {
    id: node.id,
    type: node.type,
    config: node.data.config,
    inputs: node.data.inputs,
    outputs: node.data.outputs,
    ...(node.parentId ? { parentId: node.parentId } : {}),
  }
}

/**
 * 将画布内容转为core的workflowType
 * 应用场景：例如“保存”
 * 当初始化的时候还在的旧节点：baseWorkflow.nodes，新增了node，但是这个node是画布的数据结构，需要转换
 */
export const toWorkflow = (
  baseWorkflow: Workflow,
  nodes: readonly WorkflowCanvasNode[],
  edges: readonly WorkflowEdge[],
) => {
  return {
    ...baseWorkflow,
    nodes: nodes.map(toWorkflowNode),
    edges: [...edges],
  }
}

// 取工作流编辑器数据中的layout字段
export const toWorkflowEditorLayout = (
  nodes: readonly WorkflowCanvasNode[],
  viewport: Viewport | undefined,
): WorkflowEditorSnapshot['layout'] => {
  return {
    positions: Object.fromEntries(nodes.map((node) => [node.id, node.position])),
    sizes: Object.fromEntries(
      nodes
        // 只保留loop节点
        .filter((node) => node.type === BuiltinNodeType.LOOP)
        // 保存宽高大小，最终会保存到layout.sizes中
        .flatMap((node) => {
          // measured是react flow提供的
          const width = node.measured?.width
          const height = node.measured?.height
          return width && height ? [[node.id, { width, height }]] : []
        }),
    ),
    ...(viewport ? { viewport } : {}),
  }
}
