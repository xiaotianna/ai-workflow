/**
 * 判断候选边是否能够连接
 * - 候选边：指的是用户拖动连线时，程序需要先判断这条边是否合法，但此时它还没有真正创建，也没有正式id
 */

import type { WorkflowCanvasNode } from '@/components/workflow/types'
import {
  nodeRegistry,
  validateWorkflow,
  workflowSchema,
  type Workflow,
  type WorkflowEdge,
} from '@ai-workflow/core'
import type { Connection } from '@xyflow/react'
import { toWorkflow } from './editor-transform'

// 候选边临时id
const CANDIDATE_EDGE_ID = '__candidate-edge__'

// 判断当前候选边连线是否能通过core的保存校验
export const canConnect = (
  connection: Connection | WorkflowEdge,
  baseWorkflow: Workflow,
  nodes: readonly WorkflowCanvasNode[],
  edges: readonly WorkflowEdge[],
): boolean => {
  const { source, sourceHandle, target, targetHandle } = connection
  if (!sourceHandle || !targetHandle || source === target) return false

  const sourceNode = nodes.find((node) => node.id === source)
  const targetNode = nodes.find((node) => node.id === target)
  if (!sourceNode || !targetNode) return false

  const sourceType = nodeRegistry.get(sourceNode.type)
  const targetType = nodeRegistry.get(targetNode.type)

  if (!sourceType || !sourceType.schema.safeParse(sourceNode.data.config).success) return false
  if (!targetType || !targetType.schema.safeParse(targetNode.data.config).success) return false

  // 构造一个临时边
  const candidateEdge: WorkflowEdge = {
    id: CANDIDATE_EDGE_ID,
    source,
    sourceHandle,
    target,
    targetHandle,
  }
  // 将临时边添加到整个工作流数据中
  const candidateWorkflow = toWorkflow(baseWorkflow, nodes, [...edges, candidateEdge])
  const parsedWorkflow = workflowSchema.safeParse(candidateWorkflow)

  if (!parsedWorkflow.success) return false

  // 进行工作流的基础node、edge校验，只有返回的错误统计数组中有edge的错误，并且这个统计的id是临时边，就不运行连接
  return !validateWorkflow(parsedWorkflow.data, nodeRegistry).some(
    (issue) => issue.scope === 'edge' && issue.edgeId === CANDIDATE_EDGE_ID,
  )
}
