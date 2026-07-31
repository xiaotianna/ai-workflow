import {
  CONDITION_LOGICAL_OPERATOR_KINDS,
  CONDITION_OPERATOR_KINDS,
  CONDITION_OPERATOR_OPTIONS,
  CONDITION_OPERATOR_VALUES,
  conditionNode,
  conditionOperatorRequiresRightValue,
  getConditionLogicalOperatorLabel,
  variableValueSchema,
  type ConditionItem,
  type ConditionLogicalOperator,
  type ConditionNodeConfig,
  type ConditionOperator,
  type ConditionRule,
  type VariableValueInput,
} from '@ai-workflow/core'
import { generateUuid } from '@ai-workflow/shared/utils/uuid'
import { Button } from '@ai-workflow/ui/components/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@ai-workflow/ui/components/select'
import { cn } from '@ai-workflow/ui/lib/utils'
import { Plus, RefreshCw, Trash2 } from 'lucide-react'

import type { NodeConfigRendererProps } from '../components/node-config-section'
import { VariableValueEditor } from '../components/variable-value-editor'
import { getFieldError } from '../utils/get-field-error'

const createDirectValue = () =>
  ({
    type: 'value',
    value: '',
  }) as const

const CONDITION_VALUE_EDITOR_CLASS_NAME =
  'rounded-none! bg-transparent [&_button]:rounded-none! [&_button]:border-transparent! [&_input]:rounded-none! [&_input]:border-transparent!'

function createConditionRule(): ConditionRule {
  return {
    id: generateUuid(),
    left: createDirectValue(),
    operator: CONDITION_OPERATOR_KINDS.CONTAINS,
    right: createDirectValue(),
  }
}

function normalizeConditionLabels(conditions: readonly ConditionItem[]): ConditionItem[] {
  let caseIndex = 0

  return conditions.map((condition) => {
    if (condition.isFallback) {
      return {
        ...condition,
        conditionLabel: 'ELSE',
      }
    }

    caseIndex += 1

    return {
      ...condition,
      conditionLabel: `CASE${caseIndex}`,
    }
  })
}

function parseVariableValue(value: VariableValueInput) {
  const result = variableValueSchema.safeParse(value)
  return result.success ? result.data : undefined
}

function ConditionOperatorSelect({
  value,
  disabled,
  onValueChange,
}: {
  value: ConditionOperator
  disabled?: boolean
  onValueChange: (value: ConditionOperator) => void
}) {
  return (
    <Select
      value={value}
      disabled={disabled}
      onValueChange={(nextValue) => {
        const operator = CONDITION_OPERATOR_VALUES.find((candidate) => candidate === nextValue)
        if (operator) onValueChange(operator)
      }}
    >
      <SelectTrigger
        size="sm"
        className="h-8 w-full rounded-none! border-transparent! bg-transparent"
        aria-label="条件运算符"
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent
        position="popper"
        align="end"
        sideOffset={4}
        className="w-(--radix-select-trigger-width)"
      >
        {CONDITION_OPERATOR_OPTIONS.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

function ConditionLogicalOperatorToggle({
  value,
  disabled,
  onValueChange,
}: {
  value: ConditionLogicalOperator
  disabled?: boolean
  onValueChange: (value: ConditionLogicalOperator) => void
}) {
  const nextValue =
    value === CONDITION_LOGICAL_OPERATOR_KINDS.AND
      ? CONDITION_LOGICAL_OPERATOR_KINDS.OR
      : CONDITION_LOGICAL_OPERATOR_KINDS.AND
  const currentLabel = getConditionLogicalOperatorLabel(value)
  const nextLabel = getConditionLogicalOperatorLabel(nextValue)

  return (
    <Button
      type="button"
      variant="secondary"
      size="xs"
      className="text-primary h-6 min-w-12 gap-0.5 px-1.5 text-[10px] font-medium"
      disabled={disabled}
      aria-label={`当前条件关系为 ${currentLabel}，点击切换为 ${nextLabel}`}
      onClick={() => onValueChange(nextValue)}
    >
      {currentLabel}
      <RefreshCw className="size-3" aria-hidden />
    </Button>
  )
}

function ConditionRuleEditor({
  rule,
  path,
  availableVariables,
  errors,
  disabled,
  onChange,
  onRemove,
}: {
  rule: ConditionRule
  path: string
  availableVariables: NonNullable<NodeConfigRendererProps['availableVariables']>
  errors: NodeConfigRendererProps['errors']
  disabled?: boolean
  onChange: (rule: ConditionRule) => void
  onRemove: () => void
}) {
  const leftError = getFieldError(errors, `${path}.left`)
  const rightError = getFieldError(errors, `${path}.right`)
  const operatorError = getFieldError(errors, `${path}.operator`)
  const requiresRightValue = conditionOperatorRequiresRightValue(rule.operator)
  const hasError = Boolean(leftError || rightError || operatorError)

  return (
    <div className="space-y-1.5">
      <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_24px] items-start gap-1.5">
        <div
          className={cn(
            'bg-input min-w-0 overflow-hidden rounded-md border border-transparent',
            hasError && 'border-destructive dark:border-destructive/70',
          )}
        >
          <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_88px] items-center">
            <VariableValueEditor
              className={CONDITION_VALUE_EDITOR_CLASS_NAME}
              value={rule.left}
              availableVariables={availableVariables}
              disabled={disabled}
              error={leftError}
              label="左侧条件值"
              placeholder="输入值"
              variablePickerEndOffset={88}
              onChange={(value) => {
                const left = parseVariableValue(value)
                if (left) onChange({ ...rule, left })
              }}
            />

            <div className="border-border min-w-0 border-l-[0.5px]">
              <ConditionOperatorSelect
                value={rule.operator}
                disabled={disabled}
                onValueChange={(operator) => {
                  if (conditionOperatorRequiresRightValue(operator)) {
                    onChange({
                      ...rule,
                      operator,
                      right: rule.right ?? createDirectValue(),
                    })
                    return
                  }

                  const { right: _right, ...ruleWithoutRight } = rule
                  onChange({
                    ...ruleWithoutRight,
                    operator,
                  })
                }}
              />
            </div>
          </div>

          {requiresRightValue && rule.right ? (
            <div className="border-border border-t-[0.5px]">
              <VariableValueEditor
                className={CONDITION_VALUE_EDITOR_CLASS_NAME}
                value={rule.right}
                availableVariables={availableVariables}
                disabled={disabled}
                error={rightError}
                label="右侧条件值"
                placeholder="输入值"
                onChange={(value) => {
                  const right = parseVariableValue(value)
                  if (right) onChange({ ...rule, right })
                }}
              />
            </div>
          ) : null}
        </div>

        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          className="text-muted-foreground hover:text-destructive focus-visible:text-destructive mt-1"
          disabled={disabled}
          aria-label="删除条件"
          onClick={onRemove}
        >
          <Trash2 className="size-4" aria-hidden />
        </Button>
      </div>

      {operatorError ? <p className="text-destructive text-xs leading-4">{operatorError}</p> : null}
    </div>
  )
}

function ConditionBranchEditor({
  condition,
  index,
  removable,
  availableVariables,
  errors,
  disabled,
  onChange,
  onRemove,
}: {
  condition: ConditionItem
  index: number
  removable: boolean
  availableVariables: NonNullable<NodeConfigRendererProps['availableVariables']>
  errors: NodeConfigRendererProps['errors']
  disabled?: boolean
  onChange: (condition: ConditionItem) => void
  onRemove: () => void
}) {
  const branchLabel = index === 0 ? 'IF' : 'ELIF'
  const branchError = getFieldError(errors, `conditions.${index}`)

  return (
    <section className="border-border border-b-[0.5px] pb-4">
      <div className="grid grid-cols-[48px_minmax(0,1fr)] items-start gap-2">
        <div className="pt-0.5">
          <h3 className="text-sm leading-4 font-semibold">{branchLabel}</h3>
          <p className="text-muted-foreground mt-0.5 text-[10px] leading-3 uppercase">
            {condition.conditionLabel}
          </p>
        </div>

        <div className="min-w-0 space-y-2">
          <div className="relative">
            {condition.rules.length > 1 ? (
              <>
                <span
                  className="border-border pointer-events-none absolute inset-y-3 -left-4 w-4 rounded-l-md border-y-[0.5px] border-l-[0.5px]"
                  aria-hidden
                />
                <div className="absolute top-1/2 -left-13 z-10 -translate-y-1/2">
                  <ConditionLogicalOperatorToggle
                    value={condition.logicalOperator}
                    disabled={disabled}
                    onValueChange={(logicalOperator) =>
                      onChange({
                        ...condition,
                        logicalOperator,
                      })
                    }
                  />
                </div>
              </>
            ) : null}

            <div className="space-y-2">
              {condition.rules.map((rule, ruleIndex) => (
                <ConditionRuleEditor
                  key={rule.id}
                  rule={rule}
                  path={`conditions.${index}.rules.${ruleIndex}`}
                  availableVariables={availableVariables}
                  errors={errors}
                  disabled={disabled}
                  onChange={(nextRule) =>
                    onChange({
                      ...condition,
                      rules: condition.rules.map((candidate) =>
                        candidate.id === rule.id ? nextRule : candidate,
                      ),
                    })
                  }
                  onRemove={() =>
                    onChange({
                      ...condition,
                      rules: condition.rules.filter((candidate) => candidate.id !== rule.id),
                    })
                  }
                />
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between gap-2">
            <Button
              type="button"
              variant="secondary"
              size="xs"
              disabled={disabled}
              onClick={() =>
                onChange({
                  ...condition,
                  rules: [...condition.rules, createConditionRule()],
                })
              }
            >
              <Plus aria-hidden />
              添加条件
            </Button>

            <Button
              type="button"
              variant="ghost"
              size="xs"
              className="text-muted-foreground hover:text-destructive focus-visible:text-destructive"
              disabled={disabled || !removable}
              aria-label={`移除 ${condition.conditionLabel}`}
              onClick={onRemove}
            >
              <Trash2 aria-hidden />
              移除
            </Button>
          </div>

          {branchError ? <p className="text-destructive text-xs leading-4">{branchError}</p> : null}
        </div>
      </div>
    </section>
  )
}

export function ConditionConfigEditor({
  config,
  availableVariables = [],
  errors,
  disabled,
  onConfigChange,
}: NodeConfigRendererProps) {
  const parsedConfig = conditionNode.schema.safeParse(config)

  if (!parsedConfig.success) {
    return (
      <p className="text-destructive text-xs leading-4">
        当前条件配置与新版结构不兼容，请重新创建 Condition 节点
      </p>
    )
  }

  const conditions = parsedConfig.data.conditions
  const normalConditions = conditions.filter((condition) => !condition.isFallback)
  const fallbackCondition = conditions.find((condition) => condition.isFallback)

  function applyConditions(nextConditions: readonly ConditionItem[]) {
    const nextConfig: ConditionNodeConfig = {
      conditions: normalizeConditionLabels(nextConditions),
    }

    onConfigChange({
      ...nextConfig,
    })
  }

  return (
    <div className="space-y-4">
      {normalConditions.map((condition, index) => (
        <ConditionBranchEditor
          key={condition.portId}
          condition={condition}
          index={index}
          removable={normalConditions.length > 1}
          availableVariables={availableVariables}
          errors={errors}
          disabled={disabled}
          onChange={(nextCondition) =>
            applyConditions(
              conditions.map((candidate) =>
                candidate.portId === condition.portId ? nextCondition : candidate,
              ),
            )
          }
          onRemove={() =>
            applyConditions(conditions.filter((candidate) => candidate.portId !== condition.portId))
          }
        />
      ))}

      <Button
        type="button"
        variant="secondary"
        size="sm"
        className="w-full"
        disabled={disabled}
        onClick={() => {
          const nextCondition: ConditionItem = {
            portId: generateUuid(),
            conditionLabel: `CASE${normalConditions.length + 1}`,
            logicalOperator: CONDITION_LOGICAL_OPERATOR_KINDS.AND,
            rules: [],
            isFallback: false,
          }
          const fallbackIndex = conditions.findIndex((condition) => condition.isFallback)
          const nextConditions = [...conditions]
          nextConditions.splice(
            fallbackIndex === -1 ? nextConditions.length : fallbackIndex,
            0,
            nextCondition,
          )
          applyConditions(nextConditions)
        }}
      >
        <Plus aria-hidden />
        ELIF
      </Button>

      {fallbackCondition ? (
        <section className="border-border border-t-[0.5px] pt-4">
          <h3 className="text-sm leading-4 font-semibold">ELSE</h3>
          <p className="text-muted-foreground mt-1 text-xs leading-4">
            用于定义 IF 和 ELIF 条件不满足时应执行的逻辑。
          </p>
        </section>
      ) : null}
    </div>
  )
}
