import {
  CONDITION_LOGICAL_OPERATOR_KINDS,
  CONDITION_OPERATOR_KINDS,
  type ConditionRules,
  type JsonValue,
} from '@ai-workflow/core'

import type { VariableResolutionContext } from '../variable/resolve-variable-value'
import { resolveVariableValue } from '../variable/resolve-variable-value'

function isEmpty(value: JsonValue): boolean {
  return (
    value === null ||
    value === '' ||
    (Array.isArray(value) && value.length === 0) ||
    (typeof value === 'object' && !Array.isArray(value) && Object.keys(value).length === 0)
  )
}

function asComparableText(value: JsonValue): string {
  return typeof value === 'string' ? value : JSON.stringify(value)
}

function equals(left: JsonValue, right: JsonValue): boolean {
  return JSON.stringify(left) === JSON.stringify(right)
}

function evaluateRule(
  rule: ConditionRules['rules'][number],
  context: VariableResolutionContext,
): boolean {
  const left = resolveVariableValue(rule.left, context)
  const right = rule.right ? resolveVariableValue(rule.right, context) : null

  switch (rule.operator) {
    case CONDITION_OPERATOR_KINDS.CONTAINS: {
      return asComparableText(left).includes(asComparableText(right))
    }
    case CONDITION_OPERATOR_KINDS.NOT_CONTAINS: {
      return !asComparableText(left).includes(asComparableText(right))
    }
    case CONDITION_OPERATOR_KINDS.STARTS_WITH: {
      return asComparableText(left).startsWith(asComparableText(right))
    }
    case CONDITION_OPERATOR_KINDS.ENDS_WITH: {
      return asComparableText(left).endsWith(asComparableText(right))
    }
    case CONDITION_OPERATOR_KINDS.EQUALS: {
      return equals(left, right)
    }
    case CONDITION_OPERATOR_KINDS.NOT_EQUALS: {
      return !equals(left, right)
    }
    case CONDITION_OPERATOR_KINDS.IS_EMPTY: {
      return isEmpty(left)
    }
    case CONDITION_OPERATOR_KINDS.IS_NOT_EMPTY: {
      return !isEmpty(left)
    }
  }
}

export function evaluateConditionRules(
  condition: ConditionRules,
  context: VariableResolutionContext,
): boolean {
  if (condition.rules.length === 0) return false
  const results = condition.rules.map((rule) => evaluateRule(rule, context))
  return condition.logicalOperator === CONDITION_LOGICAL_OPERATOR_KINDS.AND
    ? results.every(Boolean)
    : results.some(Boolean)
}
