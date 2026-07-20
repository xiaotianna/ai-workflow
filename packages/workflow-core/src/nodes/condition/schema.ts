import { z } from 'zod'

export const conditionItemSchema = z.object({
  // 作为端口id
  portId: z.string().min(1),
  // 条件名称
  conditionLabel: z.string().trim().min(1, '条件名称不能为空'),
  // 条件表达式，else分支不需要表达式
  condition: z.string().trim().optional(),
  // 兜底分支标记（else），为true表示走else
  isFallback: z.boolean().default(false),
})

export const conditionNodeSchema = z.object({
  conditions: z.array(conditionItemSchema).min(1, '至少需要一个条件'),
})
