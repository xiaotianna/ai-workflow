import { z } from 'zod'

export const llmNodeSchema = z.object({
  prompt: z.string().min(1, 'Prompt 不能为空'),
})
