import { z } from 'zod'

export const llmNodeSchema = z.object({
  prompt: z.string().trim().min(1, 'Prompt 不能为空').default('请根据输入生成回答'),
})

export type LlmNodeConfig = z.output<typeof llmNodeSchema>
