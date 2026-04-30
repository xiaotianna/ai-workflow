import { z } from 'zod'

export const chatNodeSchema = z.object({
  prompt: z.string().min(1, 'Prompt 不能为空'),

  model: z.enum(['gpt-4.1', 'gpt-4.1-mini', 'deepseek-chat']).default('gpt-4.1-mini'),

  temperature: z.number().min(0).max(2).default(0.7),

  systemMessage: z.string().optional().default(''),
})
