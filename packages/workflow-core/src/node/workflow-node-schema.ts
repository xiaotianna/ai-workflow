import { z } from 'zod'

/**
 * 工作流中实际保存的节点实例，是前端传递的的内容，获取到前端配置进行校验，大致思路如下：
const workflowNode: WorkflowNode = {
  id: 'chat-1',
  type: 'chat',
  config: {
    prompt: '你好',
  },
}
const nodeType = registry.getOrThrow(workflowNode.type)
const config = nodeType.schema.parse(workflowNode.config)

与 workflow/workflow-schema.ts的区别：
- workflowNodeSchema：校验一个节点
- workflowSchema：校验一整个工作流
*/
export const workflowNodeSchema = z.object({
  id: z.string().min(1, '节点 ID 不能为空'),
  type: z.string().min(1, '节点类型不能为空'),
  /**
   * 节点配置
   * 这里只做通用约束，具体配置由对应节点的 schema 校验，实际执行前需要使用：
   * chatNode.schema.parse(node.config) -> schema.parse由zod提供，可以用safeParse
   */
  config: z.record(z.string(), z.unknown()).default({}),
})

export type WorkflowNode = z.infer<typeof workflowNodeSchema>
