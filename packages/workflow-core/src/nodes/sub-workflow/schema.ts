import { z } from 'zod'

export const subWorkflowReferenceSchema = z.object({
  // 目标 Workflow 的稳定 ID，供运行时创建子 Run；创建节点时允许为空草稿
  id: z.string().trim().default(''),
  // Studio App ID，供编辑器目录匹配与拉取草稿契约；缺少时仍可用 id 保留运行引用
  appId: z.string().trim().default(''),
  name: z.string().trim().min(1, '子工作流名称不能为空').optional(),
  icon: z.string().trim().min(1, '子工作流图标不能为空').optional(),
})

function migrateLegacyWorkflowId(value: unknown): unknown {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return value

  const config = value as Record<string, unknown>
  if (Object.hasOwn(config, 'workflow')) return value
  if (!Object.hasOwn(config, 'workflowId')) return value

  const { workflowId, ...nextConfig } = config

  return {
    ...nextConfig,
    workflow:
      typeof workflowId === 'string'
        ? {
            id: workflowId.trim(),
            appId: '',
          }
        : {
            id: '',
            appId: '',
          },
  }
}

export const subWorkflowNodeSchema = z.preprocess(
  migrateLegacyWorkflowId,
  z.object({
    workflow: subWorkflowReferenceSchema.default({
      id: '',
      appId: '',
    }),
  }),
)

export type SubWorkflowReference = z.output<typeof subWorkflowReferenceSchema>
export type SubWorkflowNodeConfig = z.output<typeof subWorkflowNodeSchema>
