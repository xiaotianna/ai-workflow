import {
  getConditionLogicalOperatorLabel,
  getConditionOperatorLabel,
  type ConditionNodeConfig,
  type ConditionRule,
  type VariableValue,
} from '@ai-workflow/core'
import { VariableIcon } from '@ai-workflow/ui/components/variable-icon'
import {
  NodeContentList,
  NodeHeader,
  NodePortsRender,
  NodeWrapper,
} from '../../components/base-node'
import { NodeContentItem } from '../../components/node-content-item'
import type {
  NodeRendererProps,
  VariableReferenceDisplayResolver,
} from '../../contracts/node-content'

function formatVariableValue(
  value: VariableValue,
  resolveVariableReferenceDisplay?: VariableReferenceDisplayResolver,
) {
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
  const display = resolveVariableReferenceDisplay?.(reference)

  if (display) {
    return `${display.sourceLabel} / ${display.variableName}`
  }

  const path = reference.path.length > 0 ? `.${reference.path.join('.')}` : ''

  if (reference.scope === 'node') {
    return `${reference.nodeId}.${reference.outputKey}${path}`
  }

  if (reference.scope === 'system') {
    return `sys.${reference.key}${path}`
  }

  return `env.${reference.variableId}${path}`
}

function formatConditionRule(
  rule: ConditionRule,
  resolveVariableReferenceDisplay?: VariableReferenceDisplayResolver,
) {
  const left = formatVariableValue(rule.left, resolveVariableReferenceDisplay)
  const operator = getConditionOperatorLabel(rule.operator)

  return rule.right
    ? `${left} ${operator} ${formatVariableValue(rule.right, resolveVariableReferenceDisplay)}`
    : `${left} ${operator}`
}

function formatConditionLabel(label: string) {
  return label.replace(/^CASE\s*(\d+)$/i, 'CASE $1')
}

function ConditionValueSummary({
  value,
  resolveVariableReferenceDisplay,
}: {
  value: VariableValue
  resolveVariableReferenceDisplay?: VariableReferenceDisplayResolver
}) {
  const formattedValue = formatVariableValue(value, resolveVariableReferenceDisplay)

  if (value.type === 'value') {
    return <span className="wrap-break-word">{formattedValue}</span>
  }

  const display = resolveVariableReferenceDisplay?.(value.reference)

  return (
    <span className="inline-flex max-w-full min-w-0 items-center gap-1 align-bottom">
      <VariableIcon className="text-primary size-3.5" />
      {display ? (
        <>
          <span className="text-foreground/80 max-w-20 shrink-0 truncate">
            {display.sourceLabel}
          </span>
          <span className="shrink-0" aria-hidden>
            /
          </span>
          <span className="min-w-0 truncate">{display.variableName}</span>
        </>
      ) : (
        <span className="min-w-0 truncate">{formattedValue}</span>
      )}
    </span>
  )
}

function ConditionRuleSummary({
  rule,
  resolveVariableReferenceDisplay,
}: {
  rule: ConditionRule
  resolveVariableReferenceDisplay?: VariableReferenceDisplayResolver
}) {
  const operator = getConditionOperatorLabel(rule.operator)
  const summary = formatConditionRule(rule, resolveVariableReferenceDisplay)

  return (
    <div
      className="text-muted-foreground line-clamp-2 min-w-0 text-xs leading-5 font-medium"
      title={summary}
    >
      <ConditionValueSummary
        value={rule.left}
        resolveVariableReferenceDisplay={resolveVariableReferenceDisplay}
      />
      <span className="text-foreground/70 mx-1 font-sans">{operator}</span>
      {rule.right ? (
        <ConditionValueSummary
          value={rule.right}
          resolveVariableReferenceDisplay={resolveVariableReferenceDisplay}
        />
      ) : null}
    </div>
  )
}

export function ConditionNode({
  node,
  definition,
  ports,
  selected = false,
  disabled = false,
  onSelect,
  onDelete,
  renderPort,
  resolveVariableReferenceDisplay,
}: NodeRendererProps<ConditionNodeConfig>) {
  const conditions = node.config.conditions

  return (
    <NodeWrapper selected={selected} disabled={disabled} onSelect={onSelect}>
      <NodeHeader definition={definition} onDelete={onDelete} />

      {/* 输入端口 */}
      <NodePortsRender
        nodeId={node.id}
        direction="input"
        ports={ports.inputs}
        renderPort={renderPort}
      />

      <NodeContentList>
        {conditions.map((condition, conditionIndex) => {
          const outputPort = ports.outputs[condition.portId]
          const branchType = condition.isFallback ? 'ELSE' : conditionIndex === 0 ? 'IF' : 'ELIF'

          return (
            <div key={condition.portId} className="min-w-0">
              <div className="relative -mx-3 flex min-h-5 items-center justify-between gap-2 px-3">
                {!condition.isFallback ? (
                  <div className="text-muted-foreground truncate text-[10px] leading-4 font-semibold tracking-wide">
                    {formatConditionLabel(condition.conditionLabel)}
                  </div>
                ) : null}
                <div className="text-foreground ml-auto shrink-0 text-xs leading-4 font-semibold">
                  {branchType}
                </div>

                {/* 输出端口 */}
                {outputPort ? (
                  <NodePortsRender
                    nodeId={node.id}
                    direction="output"
                    ports={{ [condition.portId]: outputPort }}
                    renderPort={renderPort}
                    layout="centered"
                  />
                ) : null}
              </div>

              {!condition.isFallback && condition.rules.length > 0 ? (
                <div className="mt-1 space-y-0.5">
                  {condition.rules.map((rule, ruleIndex) => (
                    <div key={rule.id} className="relative">
                      <NodeContentItem
                        content={
                          <div
                            className={ruleIndex < condition.rules.length - 1 ? 'pr-7' : undefined}
                          >
                            <ConditionRuleSummary
                              rule={rule}
                              resolveVariableReferenceDisplay={resolveVariableReferenceDisplay}
                            />
                          </div>
                        }
                      />
                      {ruleIndex < condition.rules.length - 1 ? (
                        <div className="text-primary pointer-events-none absolute right-1 -bottom-1.5 z-10 text-[10px] leading-3 font-semibold">
                          {getConditionLogicalOperatorLabel(condition.logicalOperator)}
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          )
        })}
      </NodeContentList>
    </NodeWrapper>
  )
}
