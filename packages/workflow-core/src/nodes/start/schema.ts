import { z } from 'zod'
import { DATA_TYPE_VALUES } from '../../port/data-types'

const startVariableSchema = z.object({
  key: z
    .string()
    .trim()
    .min(1, '变量名不能为空')
    .regex(/^[a-zA-Z_]\w*$/, '变量名格式不正确'),
  label: z.string().trim().min(1, '显示名称不能为空'),
  dataType: z.enum(DATA_TYPE_VALUES),
  required: z.boolean().default(false),
  defaultValue: z.unknown().optional(),
})

/**
 * 运行时可以直接复用：
 * const config = startNodeSchema.parse(rawConfig)
 * config 已获得可靠类型：console.log(config.variables)
 */
export const startNodeSchema = z.object({
  variables: z.array(startVariableSchema).default([]),
})

export type StartNodeConfig = z.infer<typeof startNodeSchema>
