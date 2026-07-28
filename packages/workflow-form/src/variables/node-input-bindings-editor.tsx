import type { VariableValueInput } from '@ai-workflow/core'
import { Button } from '@ai-workflow/ui/components/button'
import { Input } from '@ai-workflow/ui/components/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@ai-workflow/ui/components/select'
import { Trash2 } from 'lucide-react'

import type {
  AvailableVariableOption,
  NodeVariableSectionRendererProps,
} from '../components/node-variable-section'
import { VariableSectionHeader } from '../components/variable-section-header'
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
    <div className="grid min-w-0 grid-cols-[104px_minmax(0,1fr)] gap-2">
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
          className="w-full"
          aria-label="变量取值方式"
          aria-invalid={Boolean(error)}
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent
          position="popper"
          align="start"
          sideOffset={4}
          className="w-(--radix-select-trigger-width)"
        >
          <SelectItem value="value">直接值</SelectItem>
          <SelectItem value="reference" disabled={availableVariables.length === 0}>
            变量引用
          </SelectItem>
        </SelectContent>
      </Select>

      {value.type === 'value' ? (
        <Input
          className="h-8"
          value={stringifyDirectValue(value.value)}
          disabled={disabled}
          aria-label="变量直接值"
          aria-invalid={Boolean(error)}
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
            className="w-full"
            aria-label="上游变量"
            aria-invalid={Boolean(error)}
          >
            <SelectValue
              placeholder={availableVariables.length > 0 ? '请选择上游变量' : '无可用上游变量'}
            />
          </SelectTrigger>
          <SelectContent
            position="popper"
            align="start"
            sideOffset={4}
            className="w-(--radix-select-trigger-width)"
          >
            {availableVariables.map((option) => (
              <SelectItem key={option.id} value={option.id}>
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
    <section className="space-y-3">
      <VariableSectionHeader
        label={section.label}
        description={section.description}
        disabled={disabled}
        onAdd={addInput}
      />

      {entries.length === 0 ? (
        <p className="text-muted-foreground rounded-lg border border-dashed px-3 py-4 text-center text-xs">
          暂未配置{section.label}
        </p>
      ) : (
        <div className="space-y-2">
          {entries.map(([key, value], index) => {
            const error = getFieldError(inputErrors, key)

            return (
              <div
                key={index}
                className="border-border/60 space-y-2 rounded-lg border-[0.5px] p-2.5"
              >
                <div className="flex items-center gap-2">
                  <Input
                    className="h-8"
                    value={key}
                    disabled={disabled}
                    aria-label={`${section.label}名称`}
                    aria-invalid={Boolean(error)}
                    placeholder="变量 Key"
                    onChange={(event) => renameInput(index, key, event.currentTarget.value)}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
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
                    <Trash2 aria-hidden />
                  </Button>
                </div>

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

                {error ? <p className="text-destructive text-xs leading-4">{error}</p> : null}
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}
