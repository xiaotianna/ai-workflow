import { z } from 'zod'

const edgeIdSchema = z.string().trim().min(1)

// 工作流一条边的schema
export const workflowEdgeSchema = z
  .object({
    id: edgeIdSchema.refine(Boolean, '边 ID 不能为空'),
    // 节点id
    source: edgeIdSchema.refine(Boolean, '源节点 ID 不能为空'),
    target: edgeIdSchema.refine(Boolean, '目标节点 ID 不能为空'),
    // 输入输出端口id
    sourceHandle: edgeIdSchema.refine(Boolean, '源端口 ID 不能为空'),
    targetHandle: edgeIdSchema.refine(Boolean, '目标端口 ID 不能为空'),
  })
  .refine(({ source, target }) => source !== target, {
    path: ['target'],
    message: '节点不能连接自身',
  })

/**
输出示例：
const edge: WorkflowEdge = {
  id: 'edge-1',
  source: 'llm-1',
  sourceHandle: 'text',
  target: 'http-1',
  targetHandle: 'body',
}
 */

export type WorkflowEdge = z.infer<typeof workflowEdgeSchema>
