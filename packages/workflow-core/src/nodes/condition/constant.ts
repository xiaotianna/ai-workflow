export const CONDITION_OPERATOR_KINDS = {
  CONTAINS: 'contains',
  NOT_CONTAINS: 'not_contains',
  STARTS_WITH: 'starts_with',
  ENDS_WITH: 'ends_with',
  EQUALS: 'equals',
  NOT_EQUALS: 'not_equals',
  IS_EMPTY: 'is_empty',
  IS_NOT_EMPTY: 'is_not_empty',
} as const

export const CONDITION_LOGICAL_OPERATOR_KINDS = {
  AND: 'and',
  OR: 'or',
} as const

export type ConditionOperator =
  (typeof CONDITION_OPERATOR_KINDS)[keyof typeof CONDITION_OPERATOR_KINDS]

export type ConditionLogicalOperator =
  (typeof CONDITION_LOGICAL_OPERATOR_KINDS)[keyof typeof CONDITION_LOGICAL_OPERATOR_KINDS]

// 条件节点选择内容
export const CONDITION_OPERATOR_VALUES = [
  CONDITION_OPERATOR_KINDS.CONTAINS,
  CONDITION_OPERATOR_KINDS.NOT_CONTAINS,
  CONDITION_OPERATOR_KINDS.STARTS_WITH,
  CONDITION_OPERATOR_KINDS.ENDS_WITH,
  CONDITION_OPERATOR_KINDS.EQUALS,
  CONDITION_OPERATOR_KINDS.NOT_EQUALS,
  CONDITION_OPERATOR_KINDS.IS_EMPTY,
  CONDITION_OPERATOR_KINDS.IS_NOT_EMPTY,
] as const satisfies readonly ConditionOperator[]

export const CONDITION_LOGICAL_OPERATOR_VALUES = [
  CONDITION_LOGICAL_OPERATOR_KINDS.AND,
  CONDITION_LOGICAL_OPERATOR_KINDS.OR,
] as const satisfies readonly ConditionLogicalOperator[]

export const CONDITION_OPERATOR_OPTIONS = [
  {
    label: '包含',
    value: CONDITION_OPERATOR_KINDS.CONTAINS,
  },
  {
    label: '不包含',
    value: CONDITION_OPERATOR_KINDS.NOT_CONTAINS,
  },
  {
    label: '开始是',
    value: CONDITION_OPERATOR_KINDS.STARTS_WITH,
  },
  {
    label: '结束是',
    value: CONDITION_OPERATOR_KINDS.ENDS_WITH,
  },
  {
    label: '是',
    value: CONDITION_OPERATOR_KINDS.EQUALS,
  },
  {
    label: '不是',
    value: CONDITION_OPERATOR_KINDS.NOT_EQUALS,
  },
  {
    label: '为空',
    value: CONDITION_OPERATOR_KINDS.IS_EMPTY,
  },
  {
    label: '不为空',
    value: CONDITION_OPERATOR_KINDS.IS_NOT_EMPTY,
  },
] as const satisfies ReadonlyArray<{
  label: string
  value: ConditionOperator
}>

export const CONDITION_LOGICAL_OPERATOR_OPTIONS = [
  {
    label: 'AND',
    value: CONDITION_LOGICAL_OPERATOR_KINDS.AND,
  },
  {
    label: 'OR',
    value: CONDITION_LOGICAL_OPERATOR_KINDS.OR,
  },
] as const satisfies ReadonlyArray<{
  label: string
  value: ConditionLogicalOperator
}>

export function conditionOperatorRequiresRightValue(operator: ConditionOperator) {
  return (
    operator !== CONDITION_OPERATOR_KINDS.IS_EMPTY &&
    operator !== CONDITION_OPERATOR_KINDS.IS_NOT_EMPTY
  )
}

export function getConditionOperatorLabel(operator: ConditionOperator) {
  return CONDITION_OPERATOR_OPTIONS.find((option) => option.value === operator)?.label ?? operator
}

export function getConditionLogicalOperatorLabel(operator: ConditionLogicalOperator) {
  return (
    CONDITION_LOGICAL_OPERATOR_OPTIONS.find((option) => option.value === operator)?.label ??
    operator
  )
}
