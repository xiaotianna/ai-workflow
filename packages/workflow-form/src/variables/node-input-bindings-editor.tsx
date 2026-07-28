import type { VariableValueInput } from '@ai-workflow/core'
import { Button } from '@ai-workflow/ui/components/button'
import { Form } from '@ai-workflow/ui/components/form'
import { Input } from '@ai-workflow/ui/components/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@ai-workflow/ui/components/select'
import { VariableIcon } from '@ai-workflow/ui/components/variable-icon'
import { Plus, TextCursorInput, Trash2 } from 'lucide-react'

import type {
  AvailableVariableOption,
  NodeVariableSectionRendererProps,
} from '../components/node-variable-section'
import { getFieldError } from '../utils/get-field-error'
import { createUniqueKey } from '../utils/create-unique-key'

function stringifyDirectValue(value: unknown) {
  if (typeof value === 'string') return value
  if (value === undefined || value === null) return ''

  try {
    return JSON.stringify(value)
  } catch {
    return String(value)
  }
}

function referencesEqual(left: unknown, right: unknown) {
  return JSON.stringify(left) === JSON.stringify(right)
}

function VariableValueEditor({
  value,
  availableVariables,
  disabled,
  error,
  onChange,
}: {
  value: VariableValueInput
  availableVariables: readonly AvailableVariableOption[]
  disabled?: boolean
  error?: string
  onChange: (value: VariableValueInput) => void
}) {
  const selectedVariable = availableVariables.find(
    (option) => value.type === 'reference' && referencesEqual(option.reference, value.reference),
  )

  return (
    <div className="bg-input flex min-w-0 rounded-md">
      <Select
        value={value.type}
        disabled={disabled}
        onValueChange={(nextType) => {
          if (nextType === 'value') {
            onChange({ type: 'value', value: '' })
            return
          }

          const firstVariable = availableVariables[0]
          if (firstVariable) {
            onChange({
              type: 'reference',
              reference: firstVariable.reference,
            })
          }
        }}
      >
        <SelectTrigger
          size="sm"
          className="w-9 shrink-0 rounded-r-none bg-transparent px-2 hover:z-10 focus-visible:z-10 [&>svg:last-child]:hidden"
          aria-label="变量取值方式"
          aria-invalid={Boolean(error)}
        >
          {value.type === 'value' ? (
            <TextCursorInput className="text-muted-foreground size-4" aria-hidden />
          ) : (
            <VariableIcon className="text-muted-foreground size-4" />
          )}
        </SelectTrigger>
        <SelectContent
          position="popper"
          align="start"
          sideOffset={4}
          className="w-(--radix-select-trigger-width)"
        >
          <SelectItem value="value" className="text-[13px]">
            直接值
          </SelectItem>
          <SelectItem
            value="reference"
            disabled={availableVariables.length === 0}
            className="text-[13px]"
          >
            变量引用
          </SelectItem>
        </SelectContent>
      </Select>

      {value.type === 'value' ? (
        <Input
          className="h-8 flex-1 rounded-l-none bg-transparent text-[13px] hover:z-10 focus-visible:z-10 md:text-[13px]"
          value={stringifyDirectValue(value.value)}
          disabled={disabled}
          aria-label="变量直接值"
          aria-invalid={Boolean(error)}
          placeholder="设置变量值"
          onChange={(event) =>
            onChange({
              type: 'value',
              value: event.currentTarget.value,
            })
          }
        />
      ) : (
        <Select
          value={selectedVariable?.id}
          disabled={disabled || availableVariables.length === 0}
          onValueChange={(optionId) => {
            const option = availableVariables.find((candidate) => candidate.id === optionId)
            if (!option) return

            onChange({
              type: 'reference',
              reference: option.reference,
            })
          }}
        >
          <SelectTrigger
            size="sm"
            className="min-w-0 flex-1 rounded-l-none bg-transparent text-[13px] hover:z-10 focus-visible:z-10 [&_[data-slot=select-value]]:min-w-0 [&_[data-slot=select-value]]:truncate"
            aria-label="上游变量"
            aria-invalid={Boolean(error)}
          >
            <SelectValue
              placeholder={availableVariables.length > 0 ? '设置变量值' : '无可用上游变量'}
            />
          </SelectTrigger>
          <SelectContent
            position="popper"
            align="end"
            sideOffset={4}
            className="w-[calc(var(--radix-select-trigger-width)+2.25rem)] max-w-[calc(var(--radix-select-trigger-width)+2.25rem)] min-w-0"
          >
            {availableVariables.map((option) => (
              <SelectItem
                key={option.id}
                value={option.id}
                title={option.label}
                className="min-w-0 text-[13px] [&>span:last-child]:min-w-0 [&>span:last-child]:truncate"
              >
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </div>
  )
}

export function NodeInputBindingsEditor({
  section,
  inputs,
  availableVariables = [],
  inputErrors,
  disabled,
  onInputsChange,
}: NodeVariableSectionRendererProps) {
  const entries = Object.entries(inputs)

  function addInput() {
    const key = createUniqueKey(
      'input',
      entries.map(([inputKey]) => inputKey),
    )

    onInputsChange({
      ...inputs,
      [key]: {
        type: 'value',
        value: '',
      },
    })
  }

  function renameInput(index: number, previousKey: string, nextKey: string) {
    if (nextKey !== previousKey && Object.hasOwn(inputs, nextKey)) {
      return
    }

    onInputsChange(
      Object.fromEntries(
        entries.map(([key, value], entryIndex) =>
          entryIndex === index ? [nextKey, value] : [key, value],
        ),
      ),
    )
  }

  return (
    <Form.Field
      label={section.label}
      description={section.description}
      actions={
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          className="text-muted-foreground"
          disabled={disabled}
          aria-label={`添加${section.label}`}
          onClick={addInput}
        >
          <Plus className="size-4" aria-hidden />
        </Button>
      }
    >
      {entries.length === 0 ? (
        <p className="text-muted-foreground rounded-lg border border-dashed px-3 py-4 text-center text-xs">
          暂未配置{section.label}
        </p>
      ) : (
        <div className="space-y-2">
          {entries.map(([key, value], index) => {
            const error = getFieldError(inputErrors, key)

            return (
              <div key={index} className="space-y-1">
                <div className="grid min-w-0 grid-cols-[minmax(96px,120px)_minmax(0,1fr)_24px] items-center gap-1.5">
                  <Input
                    className="h-8 text-[13px] md:text-[13px]"
                    value={key}
                    disabled={disabled}
                    aria-label={`${section.label}名称`}
                    aria-invalid={Boolean(error)}
                    placeholder="变量名"
                    onChange={(event) => renameInput(index, key, event.currentTarget.value)}
                  />
                  <VariableValueEditor
                    value={value}
                    availableVariables={availableVariables}
                    disabled={disabled}
                    error={error}
                    onChange={(nextValue) =>
                      onInputsChange({
                        ...inputs,
                        [key]: nextValue,
                      })
                    }
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    className="text-muted-foreground hover:text-destructive focus-visible:text-destructive"
                    disabled={disabled}
                    aria-label={`删除变量 ${key || index + 1}`}
                    onClick={() =>
                      onInputsChange(
                        Object.fromEntries(
                          entries.filter((_entry, entryIndex) => entryIndex !== index),
                        ),
                      )
                    }
                  >
                    <Trash2 className="size-4" aria-hidden />
                  </Button>
                </div>

                {error ? <p className="text-destructive text-xs leading-4">{error}</p> : null}
              </div>
            )
          })}
        </div>
      )}
    </Form.Field>
  )
}
