import type { z } from 'zod'
import { workflowNodeSchema } from './workflow-node-schema.js'

/**
 * 工作流中的节点实例
 * 是前端传递的的内容，获取到前端配置进行校验，大致思路如下：
const workflowNode: WorkflowNode = {
  id: 'chat-1',
  type: 'chat',
  config: {
    prompt: '你好',
  },
}
const nodeType = registry.getOrThrow(
  workflowNode.type,
)
const config = nodeType.schema.parse(
  workflowNode.config,
)
 */
export type WorkflowNode = z.infer<typeof workflowNodeSchema>
