import type { VariableValueInput } from '@ai-workflow/core'
import { Button } from '@ai-workflow/ui/components/button'
import { Input } from '@ai-workflow/ui/components/input'
import { Select, SelectContent, SelectItem, SelectTrigger } from '@ai-workflow/ui/components/select'
import { VariableIcon } from '@ai-workflow/ui/components/variable-icon'
import { cn } from '@ai-workflow/ui/lib/utils'
import { TextCursorInput, X } from 'lucide-react'
import { useRef } from 'react'

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
  variant?: 'default' | 'table-cell'
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
  variant = 'default',
  variablePickerEndOffset,
  onChange,
}: VariableValueEditorProps) {
  const variableTriggerRef = useRef<HTMLButtonElement>(null)
  const selectedVariable = availableVariables.find(
    (option) => value.type === 'reference' && referencesEqual(option.reference, value.reference),
  )

  if (variant === 'table-cell') {
    if (value.type === 'value') {
      return (
        <div className={cn('group/value relative min-w-0', className)}>
          <Input
            className="aria-invalid:bg-destructive/5 h-9 rounded-none border-transparent bg-transparent pr-8 text-[13px] hover:border-transparent focus-visible:border-transparent aria-invalid:border-transparent md:text-[13px] dark:aria-invalid:border-transparent"
            value={stringifyDirectValue(value.value)}
            disabled={disabled}
            aria-label={`${label}直接值`}
            aria-invalid={Boolean(error)}
            placeholder={placeholder}
            onKeyDown={(event) => {
              if (
                event.key !== '/' ||
                event.metaKey ||
                event.ctrlKey ||
                event.altKey ||
                availableVariables.length === 0
              ) {
                return
              }

              event.preventDefault()
              variableTriggerRef.current?.click()
            }}
            onChange={(event) =>
              onChange({
                type: 'value',
                value: event.currentTarget.value,
              })
            }
          />
          <NodeVariablePicker
            options={availableVariables}
            disabled={disabled || availableVariables.length === 0}
            invalid={Boolean(error)}
            matchTriggerWidth={false}
            trigger={
              <Button
                ref={variableTriggerRef}
                type="button"
                variant="ghost"
                size="icon-xs"
                disabled={disabled || availableVariables.length === 0}
                aria-label={`为${label}插入变量`}
                className="text-input-placeholder hover:text-primary focus-visible:text-primary absolute top-1/2 right-1 z-20 -translate-y-1/2 opacity-0 transition-[color,opacity] group-focus-within/value:opacity-100 group-hover/value:opacity-100"
              >
                <VariableIcon className="size-3.5" aria-hidden />
              </Button>
            }
            onValueChange={(option) =>
              onChange({
                type: 'reference',
                reference: option.reference,
              })
            }
          />
        </div>
      )
    }

    return (
      <div className={cn('flex min-w-0 items-center', className)}>
        <NodeVariablePicker
          value={selectedVariable?.id}
          options={availableVariables}
          disabled={disabled || availableVariables.length === 0}
          invalid={Boolean(error)}
          matchTriggerWidth={false}
          trigger={
            <Button
              type="button"
              variant="ghost"
              disabled={disabled || availableVariables.length === 0}
              aria-label={`${label}变量引用`}
              aria-invalid={Boolean(error)}
              className="hover:bg-background focus-visible:bg-background aria-invalid:bg-destructive/5 h-9 min-w-0 flex-1 justify-start gap-1 rounded-none px-2.5 text-[13px] font-normal shadow-none aria-invalid:border-transparent dark:aria-invalid:border-transparent"
            >
              <VariableIcon className="text-primary size-3.5" aria-hidden />
              <span className="min-w-0 truncate">
                {selectedVariable
                  ? `${selectedVariable.sourceLabel} / ${selectedVariable.variableName}`
                  : '引用变量不可用'}
              </span>
            </Button>
          }
          onValueChange={(option) =>
            onChange({
              type: 'reference',
              reference: option.reference,
            })
          }
        />
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          disabled={disabled}
          aria-label={`清除${label}变量引用`}
          className="text-muted-foreground hover:text-foreground focus-visible:text-foreground mr-0.5"
          onClick={() => onChange({ type: 'value', value: '' })}
        >
          <X className="size-3.5" aria-hidden />
        </Button>
      </div>
    )
  }

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
