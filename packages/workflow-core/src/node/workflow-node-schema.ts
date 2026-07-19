import { z } from 'zod'

/**
 * 工作流中实际保存的节点实例。
 *
 * 不包含 React Flow 的：
 * position、selected、dragging、width、height 等 UI 属性。
 * 
 * 保存后的节点类似：
 * {
      id: 'chat-1',
      type: 'chat',
      config: {
        prompt: '你好',
        model: 'gpt-4.1-mini',
      },
    }
 */
export const workflowNodeSchema = z.object({
  id: z.string().min(1, '节点 ID 不能为空'),

  /**
   * 节点类型，例如：
   * start、chat、http、condition
   */
  type: z.string().min(1, '节点类型不能为空'),

  /**
   * 节点配置。
   * 这里只做通用约束，具体配置由对应节点的 schema 校验，实际执行前需要使用：
   * chatNode.schema.parse(node.config) -> schema.parse由zod提供，可以用safeParse
   */
  config: z.record(z.string(), z.unknown()).default({}),
})
