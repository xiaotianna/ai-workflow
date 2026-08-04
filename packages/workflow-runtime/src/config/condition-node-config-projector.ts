import { conditionNode, type JsonValue } from '@ai-workflow/core'

import { RUNTIME_ERROR_CODES, RuntimeError } from '../runtime/runtime-error'
import { parseJsonObject } from '../utils/json-value'
import type { RuntimeNodeConfigProjector } from './runtime-node-config-resolver'

export const projectConditionNodeConfig: RuntimeNodeConfigProjector = (node, context) => {
  const parsed = conditionNode.schema.safeParse(node.config)
  if (!parsed.success) {
    throw new RuntimeError(
      RUNTIME_ERROR_CODES.UNSUPPORTED_NODE_CONFIG,
      `Condition 节点 ${node.id} 的配置无效`,
      {
        nodeId: node.id,
        issues: parsed.error.issues.map((issue) => issue.message),
      },
    )
  }

  const conditions: JsonValue[] = parsed.data.conditions.map((condition) => ({
    portId: condition.portId,
    conditionLabel: condition.conditionLabel,
    isFallback: condition.isFallback,
    logicalOperator: condition.logicalOperator,
    rules: condition.rules.map((rule) => ({
      id: rule.id,
      left: context.resolveValue(rule.left),
      operator: rule.operator,
      ...(rule.right === undefined ? {} : { right: context.resolveValue(rule.right) }),
    })),
  }))

  return parseJsonObject(
    {
      conditions,
    },
    `node.${node.id}.resolvedConfig`,
  )
}
