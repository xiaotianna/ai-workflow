import { z } from 'zod'

/**
 * 运行时可以直接复用：
 * const config = startNodeSchema.parse(rawConfig)
 * config 已获得可靠类型：console.log(config.prompt)
 */
export const llmNodeSchema = z.object({
  prompt: z.string().trim().min(1, 'Prompt 不能为空').default('请根据输入生成回答'),
})

export type LlmNodeConfig = z.output<typeof llmNodeSchema>
