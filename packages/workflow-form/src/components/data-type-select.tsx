import { DATA_TYPE_VALUES, type DataType } from '@ai-workflow/core'
import { Select, SelectContent, SelectItem, SelectTrigger } from '@ai-workflow/ui/components/select'
import { cn } from '@ai-workflow/ui/lib/utils'
import { Braces, Hash, SquareCheck, TypeOutline, type LucideIcon } from 'lucide-react'
import type { ComponentProps } from 'react'

const DATA_TYPE_OPTIONS = {
  string: { label: '文本', tag: 'string', icon: TypeOutline },
  number: { label: '数字', tag: 'number', icon: Hash },
  boolean: { label: '布尔值', tag: 'boolean', icon: SquareCheck },
  json: { label: 'JSON', tag: 'object', icon: Braces },
} satisfies Record<DataType, { label: string; tag: string; icon: LucideIcon }>

function getDataTypeTag(dataType: DataType) {
  return DATA_TYPE_OPTIONS[dataType].tag
}

interface DataTypeSelectProps extends Omit<ComponentProps<typeof SelectTrigger>, 'children'> {
  contentAlign?: ComponentProps<typeof SelectContent>['align']
  contentClassName?: string
  value: DataType
  onValueChange: (value: DataType) => void
}

interface DataTypeIconProps {
  className?: string
  dataType: DataType
}

function DataTypeIcon({ className, dataType }: DataTypeIconProps) {
  const Icon = DATA_TYPE_OPTIONS[dataType].icon

  return <Icon className={cn('size-3.5 shrink-0', className)} aria-hidden />
}

function DataTypeDisplay({ dataType }: { dataType: DataType }) {
  const { label, tag } = DATA_TYPE_OPTIONS[dataType]

  return (
    <span className="text-foreground/80 flex w-full min-w-0 items-center gap-2">
      <DataTypeIcon dataType={dataType} className="size-4" />
      <span className="truncate font-medium">{label}</span>
      <span className="border-border text-muted-foreground relative ml-auto inline-flex h-5 shrink-0 items-center rounded-[5px] border px-1.25 text-xs leading-3 font-medium whitespace-nowrap">
        {tag}
      </span>
    </span>
  )
}

function DataTypeSelect({
  value,
  onValueChange,
  contentAlign = 'start',
  contentClassName,
  disabled,
  className,
  size = 'default',
  ...triggerProps
}: DataTypeSelectProps) {
  return (
    <Select
      value={value}
      disabled={disabled}
      onValueChange={(nextValue) => {
        const dataType = DATA_TYPE_VALUES.find((candidate) => candidate === nextValue)
        if (dataType) onValueChange(dataType)
      }}
    >
      <SelectTrigger
        size={size}
        className={cn('w-full', className)}
        disabled={disabled}
        {...triggerProps}
      >
        <DataTypeDisplay dataType={value} />
      </SelectTrigger>
      <SelectContent
        position="popper"
        align={contentAlign}
        sideOffset={4}
        className={cn('w-(--radix-select-trigger-width)', contentClassName)}
      >
        {DATA_TYPE_VALUES.map((dataType) => (
          <SelectItem
            key={dataType}
            value={dataType}
            className="h-9 [&>span:last-child]:min-w-0 [&>span:last-child]:flex-1"
          >
            <DataTypeDisplay dataType={dataType} />
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

export { DataTypeIcon, DataTypeSelect, getDataTypeTag }
export type { DataTypeIconProps, DataTypeSelectProps }
