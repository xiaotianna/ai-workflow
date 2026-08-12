import { ENVIRONMENT_VARIABLE_NAMESPACE, type VariableReference } from '@ai-workflow/core'
import { Button } from '@ai-workflow/ui/components/button'
import { Input } from '@ai-workflow/ui/components/input'
import { Popover, PopoverContent, PopoverTrigger } from '@ai-workflow/ui/components/popover'
import {
  getVariableIconColorClass,
  VariableIcon,
  type VariableIconVariant,
} from '@ai-workflow/ui/components/variable-icon'
import { cn } from '@ai-workflow/ui/lib/utils'
import { Box, Search } from 'lucide-react'
import { useState, type ReactElement } from 'react'

import { getDataTypeTag } from '../components/data-type-select'
import type { AvailableVariableOption } from '../components/node-variable-section'

interface VariableOptionGroup {
  id: string
  label: string
  order: number
  options: AvailableVariableOption[]
}

const VARIABLE_GROUP_ORDER: Record<VariableReference['scope'], number> = {
  node: 0,
  system: 1,
  [ENVIRONMENT_VARIABLE_NAMESPACE]: 2,
}

export function VariableReferenceIcon({
  reference,
  className,
}: {
  reference: VariableReference
  className?: string
}) {
  const variant = getVariableReferenceIconVariant(reference)

  return (
    <VariableIcon
      variant={variant}
      className={cn(variant === 'default' && 'text-primary', className)}
      aria-hidden
    />
  )
}

export function getVariableReferenceColorClass(reference: VariableReference) {
  const variant = getVariableReferenceIconVariant(reference)
  return variant === 'default' ? 'text-primary' : getVariableIconColorClass(variant)
}

export function getVariableReferenceIconVariant(reference: VariableReference): VariableIconVariant {
  if (reference.scope === 'system') return 'system'
  if (reference.scope === ENVIRONMENT_VARIABLE_NAMESPACE) return 'environment'
  return 'default'
}

export interface NodeVariablePickerProps {
  value?: string
  options: readonly AvailableVariableOption[]
  disabled?: boolean
  invalid?: boolean
  endOffset?: number
  trigger?: ReactElement
  matchTriggerWidth?: boolean
  contentClassName?: string
  onValueChange: (option: AvailableVariableOption) => void
}

function groupVariableOptions(
  options: readonly AvailableVariableOption[],
  searchValue: string,
): VariableOptionGroup[] {
  const normalizedSearch = searchValue.trim().toLocaleLowerCase(),
    groups = new Map<string, VariableOptionGroup>()

  for (const option of options) {
    const dataTypeTag = getDataTypeTag(option.dataType),
      isMatch =
        normalizedSearch.length === 0 ||
        [option.sourceLabel, option.variableName, option.label, dataTypeTag].some((value) =>
          value.toLocaleLowerCase().includes(normalizedSearch),
        )

    if (!isMatch) continue

    const group = groups.get(option.sourceId) ?? {
      id: option.sourceId,
      label: option.sourceLabel,
      order: VARIABLE_GROUP_ORDER[option.reference.scope],
      options: [],
    }

    group.options.push(option)
    groups.set(option.sourceId, group)
  }

  return [...groups.values()].sort((left, right) => left.order - right.order)
}

function NodeVariablePicker({
  value,
  options,
  disabled,
  invalid,
  endOffset = 0,
  trigger,
  matchTriggerWidth = true,
  contentClassName,
  onValueChange,
}: NodeVariablePickerProps) {
  const [open, setOpen] = useState(false),
    [searchValue, setSearchValue] = useState(''),
    selectedOption = options.find((option) => option.id === value),
    groups = groupVariableOptions(options, searchValue),
    resultCount = groups.reduce((count, group) => count + group.options.length, 0)

  function handleOpenChange(nextOpen: boolean) {
    if (disabled && nextOpen) return

    setOpen(nextOpen)
    if (!nextOpen) setSearchValue('')
  }

  return (
    <Popover open={disabled ? false : open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        {trigger ?? (
          <Button
            type="button"
            variant="ghost"
            disabled={disabled}
            aria-label="上游变量"
            aria-invalid={invalid}
            className="hover:border-input-focus hover:bg-background focus-visible:border-input-focus focus-visible:bg-background aria-invalid:border-destructive h-8 min-w-0 flex-1 justify-start gap-1 rounded-l-none border border-transparent bg-transparent px-2.5 text-xs font-normal shadow-none transition-[background-color,border-color] hover:z-10 focus-visible:z-10"
          >
            {selectedOption ? (
              <>
                <Box className="text-foreground size-3.5 shrink-0" aria-hidden />
                <span
                  className="flex min-w-0 flex-1 items-center gap-1"
                  title={`${selectedOption.sourceLabel} / ${selectedOption.variableName}`}
                >
                  <span className="max-w-[40%] truncate font-medium">
                    {selectedOption.sourceLabel}
                  </span>
                  <span className="text-muted-foreground shrink-0">/</span>
                  <span
                    className={cn(
                      'flex min-w-0 flex-1 items-center gap-1 font-medium',
                      getVariableReferenceColorClass(selectedOption.reference),
                    )}
                  >
                    <VariableReferenceIcon
                      reference={selectedOption.reference}
                      className="size-3.5 shrink-0"
                    />
                    <span className="truncate">{selectedOption.variableName}</span>
                  </span>
                </span>
              </>
            ) : (
              <span className="text-input-placeholder truncate">
                {options.length > 0 ? '设置变量值' : '无可用上游变量'}
              </span>
            )}
          </Button>
        )}
      </PopoverTrigger>

      <PopoverContent
        align="end"
        alignOffset={-endOffset}
        sideOffset={4}
        collisionPadding={16}
        className={cn(
          'flex max-h-[min(30rem,var(--radix-popover-content-available-height))] max-w-[calc(100vw-2rem)] flex-col overflow-hidden p-0',
          !matchTriggerWidth && 'w-72',
          contentClassName,
        )}
        style={
          matchTriggerWidth
            ? {
                width: `calc(var(--radix-popover-trigger-width) + 2.25rem + ${endOffset}px)`,
              }
            : undefined
        }
        onOpenAutoFocus={(event) => event.preventDefault()}
      >
        <div className="border-border border-b-[0.5px] p-2.5">
          <div className="relative">
            <Search
              className="text-input-placeholder pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2"
              aria-hidden
            />
            <Input
              type="search"
              value={searchValue}
              aria-label="搜索变量"
              placeholder="搜索变量"
              className="h-9 rounded-lg pl-8 text-[13px] md:text-[13px]"
              onChange={(event) => setSearchValue(event.currentTarget.value)}
            />
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-2">
          {resultCount > 0 ? (
            <div className="space-y-2">
              {groups.map((group) => (
                <section key={group.id}>
                  <h4 className="text-muted-foreground px-2 py-1 text-xs font-medium">
                    {group.label}
                  </h4>
                  <div className="space-y-0.5">
                    {group.options.map((option) => {
                      const isSelected = option.id === value

                      return (
                        <button
                          key={option.id}
                          type="button"
                          aria-pressed={isSelected}
                          className={cn(
                            'hover:bg-accent focus-visible:bg-accent flex h-8 w-full cursor-pointer items-center gap-2 rounded-lg px-2 text-left text-[13px] transition-colors outline-none',
                            isSelected && 'bg-accent',
                          )}
                          onClick={() => {
                            onValueChange(option)
                            handleOpenChange(false)
                          }}
                        >
                          <VariableReferenceIcon
                            reference={option.reference}
                            className="size-3.5 shrink-0"
                          />
                          <span
                            className={cn(
                              'min-w-0 flex-1 truncate',
                              getVariableReferenceColorClass(option.reference),
                            )}
                            title={option.variableName}
                          >
                            {option.variableName}
                          </span>
                          <span className="text-muted-foreground shrink-0 capitalize">
                            {getDataTypeTag(option.dataType)}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                </section>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground px-3 py-8 text-center text-xs">未找到匹配的变量</p>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}

export { NodeVariablePicker }
