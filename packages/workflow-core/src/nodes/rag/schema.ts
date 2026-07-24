import { z } from 'zod'

export const ragNodeSchema = z.object({
  // 创建节点时允许为空，后续由用户选择知识库
  knowledgeBaseId: z.string().trim().default(''),
})

export type RagNodeConfig = z.output<typeof ragNodeSchema>
