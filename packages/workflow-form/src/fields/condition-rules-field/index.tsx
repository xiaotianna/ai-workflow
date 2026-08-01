import {
  CONDITION_LOGICAL_OPERATOR_KINDS,
  CONDITION_OPERATOR_KINDS,
  CONDITION_OPERATOR_OPTIONS,
  CONDITION_OPERATOR_VALUES,
  conditionOperatorRequiresRightValue,
  conditionRulesSchema,
  getConditionLogicalOperatorLabel,
  variableValueSchema,
  type ConditionLogicalOperator,
  type ConditionOperator,
  type ConditionRule,
  type ConditionRules,
  type ConditionRulesFieldSchema,
  type VariableValueInput,
} from '@ai-workflow/core'
import { generateUuid } from '@ai-workflow/shared/utils/uuid'
import { Button } from '@ai-workflow/ui/components/button'
import { Form } from '@ai-workflow/ui/components/form'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@ai-workflow/ui/components/select'
import { cn } from '@ai-workflow/ui/lib/utils'
import { Plus, RefreshCw, Trash2 } from 'lucide-react'
import { AnimatePresence, motion, MotionConfig } from 'motion/react'
import type { ReactNode } from 'react'

import { VariableValueEditor } from '../../components/variable-value-editor'
import type { AvailableVariableOption } from '../../contracts/available-variable-option'
import type { FieldRendererErrors, FieldRendererProps } from '../../contracts/field-renderer'
import { getFieldError } from '../../utils/get-field-error'

export type ConditionRulesFieldValue = ConditionRules

export type ConditionRulesFieldProps = FieldRendererProps<
  ConditionRulesFieldSchema,
  ConditionRulesFieldValue
>

export interface ConditionRulesEditorProps {
  name: string
  value: ConditionRules
  availableVariables?: readonly AvailableVariableOption[]
  errors?: FieldRendererErrors
  disabled?: boolean
  reserveLogicalOperatorSpace?: boolean
  showAddButton?: boolean
  actions?: ReactNode
  onChange: (value: ConditionRules) => void
}

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
  availableVariables: readonly AvailableVariableOption[]
  errors?: FieldRendererErrors
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

export function ConditionRulesEditor({
  name,
  value,
  availableVariables = [],
  errors,
  disabled,
  reserveLogicalOperatorSpace = false,
  showAddButton = true,
  actions,
  onChange,
}: ConditionRulesEditorProps) {
  const hasMultipleRules = value.rules.length > 1

  return (
    <div className="min-w-0 space-y-2">
      <div className={cn('relative', hasMultipleRules && reserveLogicalOperatorSpace && 'ml-12')}>
        {hasMultipleRules ? (
          <>
            <span
              className="border-border pointer-events-none absolute inset-y-3 -left-4 w-4 rounded-l-md border-y-[0.5px] border-l-[0.5px]"
              aria-hidden
            />
            <div className="absolute top-1/2 -left-13 z-10 -translate-y-1/2">
              <ConditionLogicalOperatorToggle
                value={value.logicalOperator}
                disabled={disabled}
                onValueChange={(logicalOperator) => onChange({ ...value, logicalOperator })}
              />
            </div>
          </>
        ) : null}

        <div className="space-y-2">
          <MotionConfig reducedMotion="user">
            <AnimatePresence initial={false}>
              {value.rules.map((rule, ruleIndex) => (
                <motion.div
                  key={rule.id}
                  layout="position"
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.16, ease: 'easeOut' }}
                >
                  <ConditionRuleEditor
                    rule={rule}
                    path={`${name}.rules.${ruleIndex}`}
                    availableVariables={availableVariables}
                    errors={errors}
                    disabled={disabled}
                    onChange={(nextRule) =>
                      onChange({
                        ...value,
                        rules: value.rules.map((candidate) =>
                          candidate.id === rule.id ? nextRule : candidate,
                        ),
                      })
                    }
                    onRemove={() =>
                      onChange({
                        ...value,
                        rules: value.rules.filter((candidate) => candidate.id !== rule.id),
                      })
                    }
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </MotionConfig>
        </div>
      </div>

      {showAddButton || actions ? (
        <div className="flex items-center justify-between gap-2">
          {showAddButton ? (
            <Button
              type="button"
              variant="secondary"
              size="xs"
              disabled={disabled}
              onClick={() =>
                onChange({
                  ...value,
                  rules: [...value.rules, createConditionRule()],
                })
              }
            >
              <Plus aria-hidden />
              添加条件
            </Button>
          ) : null}

          {actions}
        </div>
      ) : null}
    </div>
  )
}

export function ConditionRulesField({
  name,
  field,
  value,
  error,
  availableVariables,
  errors,
  disabled,
  onChange,
}: ConditionRulesFieldProps) {
  const parsedValue = conditionRulesSchema.safeParse(value)
  const hasRules = parsedValue.success && parsedValue.data.rules.length > 0

  return (
    <Form.Field
      label={field.label}
      description={hasRules ? field.description : undefined}
      error={error}
      required={field.required}
      actions={
        parsedValue.success ? (
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            className="text-muted-foreground"
            disabled={disabled}
            aria-label={`添加${field.label}`}
            onClick={() =>
              onChange({
                ...parsedValue.data,
                rules: [...parsedValue.data.rules, createConditionRule()],
              })
            }
          >
            <Plus className="size-4" aria-hidden />
          </Button>
        ) : undefined
      }
    >
      {parsedValue.success ? (
        <MotionConfig reducedMotion="user">
          <AnimatePresence initial={false} mode="popLayout">
            {hasRules ? (
              <motion.div
                key="rules"
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.16, ease: 'easeOut' }}
              >
                <ConditionRulesEditor
                  name={name}
                  value={parsedValue.data}
                  availableVariables={availableVariables}
                  errors={errors}
                  disabled={disabled}
                  reserveLogicalOperatorSpace
                  showAddButton={false}
                  onChange={onChange}
                />
              </motion.div>
            ) : (
              <motion.p
                key="empty"
                className="text-muted-foreground text-xs leading-4"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.16, ease: 'easeOut' }}
              >
                {field.description}
              </motion.p>
            )}
          </AnimatePresence>
        </MotionConfig>
      ) : (
        <p className="text-destructive text-xs leading-4">
          当前判断条件配置与新版结构不兼容，请重新配置
        </p>
      )}
    </Form.Field>
  )
}
