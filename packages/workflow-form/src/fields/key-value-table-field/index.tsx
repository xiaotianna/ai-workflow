import type { KeyValueTableFieldSchema, VariableValueInput } from '@ai-workflow/core'
import { generateUuid } from '@ai-workflow/shared/utils/uuid'
import { Button } from '@ai-workflow/ui/components/button'
import { Form } from '@ai-workflow/ui/components/form'
import { Trash2 } from 'lucide-react'

import { VariableValueEditor } from '../../components/variable-value-editor'
import type { AvailableVariableOption } from '../../contracts/available-variable-option'
import type { FieldRendererProps } from '../../contracts/field-renderer'
import { getFieldError } from '../../utils/get-field-error'
import { EditableTableField, type EditableTableColumn } from '../editable-table-field'

export interface KeyValueTableEntry {
  id: string
  key: VariableValueInput
  value: VariableValueInput
}

export interface KeyValueTableEntryErrors {
  key?: string
  value?: string
}

export interface KeyValueTableProps {
  ariaLabel: string
  value: readonly KeyValueTableEntry[]
  onChange: (value: KeyValueTableEntry[]) => void
  availableVariables?: readonly AvailableVariableOption[]
  addRowLabel?: string
  className?: string
  disabled?: boolean
  entryErrors?: readonly (KeyValueTableEntryErrors | undefined)[]
  keyHeader?: string
  keyPlaceholder?: string
  valueHeader?: string
  valuePlaceholder?: string
}

export interface KeyValueTableFieldProps extends FieldRendererProps<
  KeyValueTableFieldSchema,
  KeyValueTableEntry[]
> {
  addRowLabel?: string
  className?: string
  keyHeader?: string
  keyPlaceholder?: string
  valueHeader?: string
  valuePlaceholder?: string
}

export function createKeyValueTableEntry(): KeyValueTableEntry {
  return {
    id: generateUuid(),
    key: { type: 'value', value: '' },
    value: { type: 'value', value: '' },
  }
}

export function KeyValueTable({
  ariaLabel,
  value,
  onChange,
  availableVariables = [],
  addRowLabel = `添加${ariaLabel}`,
  className,
  disabled,
  entryErrors,
  keyHeader = '键',
  keyPlaceholder = '输入 / 插入变量',
  valueHeader = '值',
  valuePlaceholder = '输入 / 插入变量',
}: KeyValueTableProps) {
  function updateEntry(entryIndex: number, nextEntry: KeyValueTableEntry) {
    onChange(value.map((entry, index) => (index === entryIndex ? nextEntry : entry)))
  }

  const columns: EditableTableColumn<KeyValueTableEntry>[] = [
    {
      id: 'key',
      header: keyHeader,
      width: '42%',
      renderCell: ({ row, rowIndex }) => (
        <VariableValueEditor
          variant="table-cell"
          value={row.key}
          availableVariables={availableVariables}
          disabled={disabled}
          error={entryErrors?.[rowIndex]?.key}
          label={`${ariaLabel}第 ${rowIndex + 1} 行${keyHeader}`}
          placeholder={keyPlaceholder}
          onChange={(key) => updateEntry(rowIndex, { ...row, key })}
        />
      ),
    },
    {
      id: 'value',
      header: valueHeader,
      renderCell: ({ row, rowIndex }) => (
        <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_28px] items-center">
          <VariableValueEditor
            variant="table-cell"
            value={row.value}
            availableVariables={availableVariables}
            disabled={disabled}
            error={entryErrors?.[rowIndex]?.value}
            label={`${ariaLabel}第 ${rowIndex + 1} 行${valueHeader}`}
            placeholder={valuePlaceholder}
            onChange={(nextValue) => updateEntry(rowIndex, { ...row, value: nextValue })}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            disabled={disabled}
            aria-label={`删除${ariaLabel}第 ${rowIndex + 1} 行`}
            className="text-muted-foreground hover:text-destructive focus-visible:text-destructive opacity-0 transition-opacity group-focus-within/row:opacity-100 group-hover/row:opacity-100"
            onClick={() => onChange(value.filter((_, index) => index !== rowIndex))}
          >
            <Trash2 className="size-3.5" aria-hidden />
          </Button>
        </div>
      ),
    },
  ]

  return (
    <EditableTableField
      ariaLabel={ariaLabel}
      columns={columns}
      rows={value}
      className={className}
      disabled={disabled}
      addRowLabel={addRowLabel}
      getRowKey={(entry) => entry.id}
      onAddRow={() => onChange([...value, createKeyValueTableEntry()])}
    />
  )
}

export function KeyValueTableField({
  name,
  field,
  value,
  onChange,
  availableVariables,
  addRowLabel,
  className,
  disabled,
  error,
  errors,
  keyHeader,
  keyPlaceholder,
  valueHeader,
  valuePlaceholder,
}: KeyValueTableFieldProps) {
  const entries = Array.isArray(value) ? value : [],
    entryErrors = entries.map((_, index) => ({
      key: getFieldError(errors, `${name}.${index}.key`),
      value: getFieldError(errors, `${name}.${index}.value`),
    }))

  return (
    <Form.Field
      label={field.label}
      description={field.description}
      error={error}
      required={field.required}
      className={className}
    >
      <KeyValueTable
        ariaLabel={field.label}
        value={entries}
        onChange={onChange}
        availableVariables={availableVariables}
        addRowLabel={addRowLabel}
        disabled={disabled}
        entryErrors={entryErrors}
        keyHeader={keyHeader}
        keyPlaceholder={keyPlaceholder}
        valueHeader={valueHeader}
        valuePlaceholder={valuePlaceholder}
      />
    </Form.Field>
  )
}
