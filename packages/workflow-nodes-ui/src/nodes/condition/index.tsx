import {
  getConditionLogicalOperatorLabel,
  getConditionOperatorLabel,
  type ConditionNodeConfig,
  type ConditionRule,
  type VariableValue,
} from '@ai-workflow/core'
import { NodeContentList } from '../../components/base-node'
import { NodeContentItem } from '../../components/node-content-item'
import type { NodeContentProps } from '../../contracts/node-content'

function formatVariableValue(value: VariableValue) {
  if (value.type === 'value') {
    if (typeof value.value === 'string') return value.value || '未设置'
    if (value.value === undefined || value.value === null) return '未设置'

    try {
      return JSON.stringify(value.value)
    } catch {
      return String(value.value)
    }
  }

  const { reference } = value
  const path = reference.path.length > 0 ? `.${reference.path.join('.')}` : ''

  if (reference.scope === 'node') {
    return `${reference.nodeId}.${reference.outputKey}${path}`
  }

  if (reference.scope === 'system') {
    return `sys.${reference.key}${path}`
  }

  return `env.${reference.variableId}${path}`
}

function formatConditionRule(rule: ConditionRule) {
  const left = formatVariableValue(rule.left)
  const operator = getConditionOperatorLabel(rule.operator)

  return rule.right
    ? `${left} ${operator} ${formatVariableValue(rule.right)}`
    : `${left} ${operator}`
}

export function ConditionNodeContent({ node }: NodeContentProps<ConditionNodeConfig>) {
  const conditions = node.config.conditions

  return (
    <NodeContentList>
      {conditions.map((condition) => (
        <NodeContentItem
          key={condition.portId}
          content={
            <>
              <div className="truncate text-xs font-medium">{condition.conditionLabel}</div>

              {!condition.isFallback ? (
                <div
                  className="mt-0.5 truncate font-mono text-[11px]"
                  title={
                    condition.rules.length > 0
                      ? condition.rules
                          .map(formatConditionRule)
                          .join(` ${getConditionLogicalOperatorLabel(condition.logicalOperator)} `)
                      : '未配置条件'
                  }
                >
                  {condition.rules.length > 0
                    ? condition.rules
                        .map(formatConditionRule)
                        .join(` ${getConditionLogicalOperatorLabel(condition.logicalOperator)} `)
                    : '未配置条件'}
                </div>
              ) : null}
            </>
          }
        />
      ))}
    </NodeContentList>
  )
}
