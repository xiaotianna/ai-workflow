import { z } from 'zod'

const startNodeVariableSchema = z.object({
  // TODO：后续支持更复杂的变量定义，目前先简单使用字符串表示
  fieldType: z.enum(['string']).default('string'),
  name: z.string().min(1, '变量名称不能为空'),
  label: z.string().min(1, '显示名称不能为空'),
  maxLength: z.number().int('最大长度必须是整数').positive('最大长度必须大于 0').optional(),
  defaultValue: z.string().optional().default(''),
  required: z.boolean().default(false),
  hidden: z.boolean().default(false),
})

export const startNodeSchema = z.object({
  variables: z.array(startNodeVariableSchema).default([]),
})
