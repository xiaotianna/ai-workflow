import { z } from 'zod'
import { CONDITION_LOGICAL_OPERATOR_KINDS } from '../condition/constant'
import { conditionRulesSchema } from '../condition/schema'

export const loopNodeSchema = z.object({
  maxIterations: z
    .number()
    .int('最大循环次数必须是整数')
    .min(1, '最大循环次数不能小于 1')
    .max(10_000, '最大循环次数不能超过 10000')
    .default(100),
  terminationCondition: conditionRulesSchema.default({
    logicalOperator: CONDITION_LOGICAL_OPERATOR_KINDS.AND,
    rules: [],
  }),
})

export type LoopNodeConfig = z.output<typeof loopNodeSchema>
