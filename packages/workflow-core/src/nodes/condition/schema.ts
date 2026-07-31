import { z } from 'zod'
import { variableValueSchema } from '../../variable/variable-value-schema'
import {
  CONDITION_LOGICAL_OPERATOR_KINDS,
  CONDITION_LOGICAL_OPERATOR_VALUES,
  CONDITION_OPERATOR_KINDS,
  CONDITION_OPERATOR_VALUES,
  conditionOperatorRequiresRightValue,
} from './constant'

export const conditionRuleSchema = z
  .object({
    id: z.string().min(1, '条件 ID 不能为空'),
    left: variableValueSchema,
    operator: z.enum(CONDITION_OPERATOR_VALUES).default(CONDITION_OPERATOR_KINDS.CONTAINS),
    right: variableValueSchema.optional(),
  })
  .superRefine((rule, context) => {
    const requiresRightValue = conditionOperatorRequiresRightValue(rule.operator)

    if (requiresRightValue && rule.right === undefined) {
      context.addIssue({
        code: 'custom',
        path: ['right'],
        message: '当前运算符需要右侧条件值',
      })
    }

    if (!requiresRightValue && rule.right !== undefined) {
      context.addIssue({
        code: 'custom',
        path: ['right'],
        message: '当前运算符不需要右侧条件值',
      })
    }
  })

const conditionItemFields = {
  // 作为端口id
  portId: z.string().min(1),
  // 条件名称
  conditionLabel: z.string().trim().min(1, '条件名称不能为空'),
  // 同一分支内多条规则的组合关系，ELSE分支忽略该字段
  logicalOperator: z
    .enum(CONDITION_LOGICAL_OPERATOR_VALUES)
    .default(CONDITION_LOGICAL_OPERATOR_KINDS.AND),
  // 兜底分支标记（else），为true表示走else
  isFallback: z.boolean().default(false),
} as const

const structuredConditionItemSchema = z.object({
  ...conditionItemFields,
  rules: z.array(conditionRuleSchema),
})

const emptyLegacyConditionItemSchema = z
  .object({
    ...conditionItemFields,
    condition: z
      .string()
      .trim()
      .max(0, '旧条件表达式无法自动迁移，请重新配置 Condition 节点')
      .optional(),
  })
  .transform(({ condition: _condition, ...item }) => ({
    ...item,
    rules: [],
  }))

export const conditionItemSchema = z
  .union([
    structuredConditionItemSchema,
    // 仅兼容旧版尚未实际填写表达式的默认配置，非空字符串不做有损转换
    emptyLegacyConditionItemSchema,
  ])
  .superRefine((condition, context) => {
    if (condition.isFallback && condition.rules.length > 0) {
      context.addIssue({
        code: 'custom',
        path: ['rules'],
        message: 'ELSE 分支不能配置条件',
      })
    }
  })

export const conditionNodeSchema = z
  .object({
    conditions: z.array(conditionItemSchema).min(2, '至少需要一个条件分支和一个 ELSE 分支'),
  })
  .superRefine((config, context) => {
    const fallbackIndexes: number[] = []
    const portIds = new Set<string>()
    const ruleIds = new Set<string>()

    config.conditions.forEach((condition, conditionIndex) => {
      if (condition.isFallback) fallbackIndexes.push(conditionIndex)

      if (portIds.has(condition.portId)) {
        context.addIssue({
          code: 'custom',
          path: ['conditions', conditionIndex, 'portId'],
          message: '条件分支端口不能重复',
        })
      }
      portIds.add(condition.portId)

      condition.rules.forEach((rule, ruleIndex) => {
        if (ruleIds.has(rule.id)) {
          context.addIssue({
            code: 'custom',
            path: ['conditions', conditionIndex, 'rules', ruleIndex, 'id'],
            message: '条件 ID 不能重复',
          })
        }
        ruleIds.add(rule.id)
      })
    })

    if (fallbackIndexes.length !== 1) {
      context.addIssue({
        code: 'custom',
        path: ['conditions'],
        message: '必须且只能存在一个 ELSE 分支',
      })
      return
    }

    if (fallbackIndexes[0] !== config.conditions.length - 1) {
      context.addIssue({
        code: 'custom',
        path: ['conditions', fallbackIndexes[0] ?? 0],
        message: 'ELSE 分支必须位于最后',
      })
    }
  })

export type ConditionNodeConfig = z.output<typeof conditionNodeSchema>
export type ConditionNodeConfigInput = z.input<typeof conditionNodeSchema>
export type ConditionItem = z.output<typeof conditionItemSchema>
export type ConditionItemInput = z.input<typeof conditionItemSchema>
export type ConditionRule = z.output<typeof conditionRuleSchema>
export type ConditionRuleInput = z.input<typeof conditionRuleSchema>
