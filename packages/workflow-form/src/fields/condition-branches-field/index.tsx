import {
  CONDITION_LOGICAL_OPERATOR_KINDS,
  conditionNode,
  type ConditionBranchesFieldSchema,
  type ConditionItem,
} from '@ai-workflow/core'
import { generateUuid } from '@ai-workflow/shared/utils/uuid'
import { Button } from '@ai-workflow/ui/components/button'
import { Form } from '@ai-workflow/ui/components/form'
import { Plus, Trash2 } from 'lucide-react'

import type { FieldRendererProps } from '../../contracts/field-renderer'
import { getFieldError } from '../../utils/get-field-error'
import { ConditionRulesEditor } from '../condition-rules-field'

export type ConditionBranchesFieldValue = ConditionItem[]

export type ConditionBranchesFieldProps = FieldRendererProps<
  ConditionBranchesFieldSchema,
  ConditionBranchesFieldValue
>

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

function ConditionBranchEditor({
  condition,
  index,
  path,
  removable,
  availableVariables,
  errors,
  disabled,
  onChange,
  onRemove,
}: {
  condition: ConditionItem
  index: number
  path: string
  removable: boolean
  availableVariables: NonNullable<ConditionBranchesFieldProps['availableVariables']>
  errors: ConditionBranchesFieldProps['errors']
  disabled?: boolean
  onChange: (condition: ConditionItem) => void
  onRemove: () => void
}) {
  const branchLabel = index === 0 ? 'IF' : 'ELIF',
    branchError = getFieldError(errors, `${path}.${index}`)

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
          <ConditionRulesEditor
            name={`${path}.${index}`}
            value={{
              logicalOperator: condition.logicalOperator,
              rules: condition.rules,
            }}
            availableVariables={availableVariables}
            errors={errors}
            disabled={disabled}
            actions={
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
            }
            onChange={(nextValue) =>
              onChange({
                ...condition,
                ...nextValue,
              })
            }
          />

          {branchError ? <p className="text-destructive text-xs leading-4">{branchError}</p> : null}
        </div>
      </div>
    </section>
  )
}

export function ConditionBranchesField({
  name,
  field,
  value,
  error,
  availableVariables = [],
  errors,
  disabled,
  onChange,
}: ConditionBranchesFieldProps) {
  const parsedConfig = conditionNode.schema.safeParse({ conditions: value })

  if (!parsedConfig.success) {
    return (
      <Form.Field
        label={field.label}
        description={field.description}
        error={error}
        required={field.required}
      >
        <p className="text-destructive text-xs leading-4">
          当前条件配置与新版结构不兼容，请重新创建 Condition 节点
        </p>
      </Form.Field>
    )
  }

  const conditions = parsedConfig.data.conditions,
    normalConditions = conditions.filter((condition) => !condition.isFallback),
    fallbackCondition = conditions.find((condition) => condition.isFallback)

  function applyConditions(nextConditions: readonly ConditionItem[]) {
    onChange(normalizeConditionLabels(nextConditions))
  }

  return (
    <Form.Field
      label={field.label}
      description={field.description}
      error={error}
      required={field.required}
    >
      <div className="space-y-4">
        {normalConditions.map((condition, index) => (
          <ConditionBranchEditor
            key={condition.portId}
            condition={condition}
            index={index}
            path={name}
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
              applyConditions(
                conditions.filter((candidate) => candidate.portId !== condition.portId),
              )
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
              },
              fallbackIndex = conditions.findIndex((condition) => condition.isFallback),
              nextConditions = [...conditions]
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
    </Form.Field>
  )
}
