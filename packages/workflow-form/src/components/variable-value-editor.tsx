import type { VariableValueInput } from '@ai-workflow/core'
import { Input } from '@ai-workflow/ui/components/input'
import { Select, SelectContent, SelectItem, SelectTrigger } from '@ai-workflow/ui/components/select'
import { VariableIcon } from '@ai-workflow/ui/components/variable-icon'
import { cn } from '@ai-workflow/ui/lib/utils'
import { TextCursorInput } from 'lucide-react'

import type { AvailableVariableOption } from './node-variable-section'
import { NodeVariablePicker } from '../variables/node-variable-picker'

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

export interface VariableValueEditorProps {
  value: VariableValueInput
  availableVariables: readonly AvailableVariableOption[]
  className?: string
  disabled?: boolean
  error?: string
  label?: string
  placeholder?: string
  variablePickerEndOffset?: number
  onChange: (value: VariableValueInput) => void
}

export function VariableValueEditor({
  value,
  availableVariables,
  className,
  disabled,
  error,
  label = '变量值',
  placeholder = '设置变量值',
  variablePickerEndOffset,
  onChange,
}: VariableValueEditorProps) {
  const selectedVariable = availableVariables.find(
    (option) => value.type === 'reference' && referencesEqual(option.reference, value.reference),
  )

  return (
    <div className={cn('bg-input flex min-w-0 rounded-md', className)}>
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
          aria-label={`${label}取值方式`}
          aria-invalid={Boolean(error)}
        >
          {value.type === 'value' ? (
            <TextCursorInput className="text-muted-foreground size-4" aria-hidden />
          ) : (
            <VariableIcon className="text-muted-foreground size-4" aria-hidden />
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
          aria-label={`${label}直接值`}
          aria-invalid={Boolean(error)}
          placeholder={placeholder}
          onChange={(event) =>
            onChange({
              type: 'value',
              value: event.currentTarget.value,
            })
          }
        />
      ) : (
        <NodeVariablePicker
          value={selectedVariable?.id}
          options={availableVariables}
          disabled={disabled || availableVariables.length === 0}
          invalid={Boolean(error)}
          endOffset={variablePickerEndOffset}
          onValueChange={(option) => {
            onChange({
              type: 'reference',
              reference: option.reference,
            })
          }}
        />
      )}
    </div>
  )
}
