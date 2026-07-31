import {
  HTTP_BODY_TYPES,
  HTTP_FORM_DATA_VALUE_TYPES,
  createHttpFormDataEntry,
  createHttpRequestBody,
  type HttpBodyType,
  type HttpFormDataEntryInput,
  type HttpRequestBodyInput,
  type RequestBodyFieldSchema,
  type VariableValueInput,
} from '@ai-workflow/core'
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
import { Trash2 } from 'lucide-react'
import { useId } from 'react'

import { VariableValueEditor } from '../../components/variable-value-editor'
import type { FieldRendererProps } from '../../contracts/field-renderer'
import { getFieldError } from '../../utils/get-field-error'
import { EditableTableField, type EditableTableColumn } from '../editable-table-field'
import { KeyValueTable, type KeyValueTableEntryErrors } from '../key-value-table-field'

export const REQUEST_BODY_TYPES = HTTP_BODY_TYPES

export type RequestBodyType = HttpBodyType

export interface RequestBodyTypeOption {
  label: string
  value: RequestBodyType
  disabled?: boolean
}

export const DEFAULT_REQUEST_BODY_TYPE_OPTIONS = [
  { value: 'none', label: 'none' },
  { value: 'form-data', label: 'form-data' },
  { value: 'x-www-form-urlencoded', label: 'x-www-form-urlencoded' },
  { value: 'json', label: 'JSON' },
  { value: 'raw', label: 'raw' },
  { value: 'binary', label: 'binary' },
] satisfies readonly RequestBodyTypeOption[]

export interface RequestBodyFieldProps extends FieldRendererProps<
  RequestBodyFieldSchema,
  HttpRequestBodyInput
> {
  options?: readonly RequestBodyTypeOption[]
}

function createDirectValue(): VariableValueInput {
  return { type: 'value', value: '' }
}

function isVariableValueInput(value: unknown): value is VariableValueInput {
  if (!value || typeof value !== 'object') return false

  const valueType = (value as { type?: unknown }).type
  if (valueType === 'value') return Object.hasOwn(value, 'value')
  if (valueType === 'reference') return Object.hasOwn(value, 'reference')

  return false
}

function normalizeRequestBody(value: HttpRequestBodyInput | undefined): HttpRequestBodyInput {
  if (!value || typeof value !== 'object') return createHttpRequestBody('none')

  const body = value as { entries?: unknown; type?: unknown; value?: unknown }
  const bodyType = HTTP_BODY_TYPES.find((type) => type === body.type)

  if (bodyType === 'form-data' || bodyType === 'x-www-form-urlencoded') {
    const defaultBody = createHttpRequestBody(bodyType)

    return {
      type: bodyType,
      entries: Array.isArray(body.entries)
        ? body.entries
        : defaultBody.type === 'form-data' || defaultBody.type === 'x-www-form-urlencoded'
          ? defaultBody.entries
          : [],
    } as HttpRequestBodyInput
  }

  if (bodyType === 'json' || bodyType === 'raw' || bodyType === 'binary') {
    return {
      type: bodyType,
      value: isVariableValueInput(body.value) ? body.value : createDirectValue(),
    }
  }

  return createHttpRequestBody('none')
}

function getKeyValueEntryErrors(
  errors: RequestBodyFieldProps['errors'],
  path: string,
  entryCount: number,
): KeyValueTableEntryErrors[] {
  return Array.from({ length: entryCount }, (_, index) => ({
    key: getFieldError(errors, `${path}.${index}.key`),
    value: getFieldError(errors, `${path}.${index}.value`),
  }))
}

function getBodyValueLabel(type: 'json' | 'raw' | 'binary') {
  if (type === 'json') return 'JSON 内容'
  if (type === 'binary') return 'Binary 内容'
  return 'Raw 内容'
}

function getBodyValuePlaceholder(type: 'json' | 'raw' | 'binary') {
  if (type === 'json') return '输入 JSON，或输入 / 插入变量'
  if (type === 'binary') return '输入文件标识，或输入 / 插入变量'
  return '输入内容，或输入 / 插入变量'
}

export function RequestBodyField({
  name,
  field,
  value,
  error,
  errors,
  availableVariables = [],
  disabled,
  onChange,
  options = DEFAULT_REQUEST_BODY_TYPE_OPTIONS,
}: RequestBodyFieldProps) {
  const generatedName = useId()
  const body = normalizeRequestBody(value)
  const entriesPath = `${name}.entries`

  function renderBodyContent() {
    if (body.type === 'none') return null

    if (body.type === 'x-www-form-urlencoded') {
      const entries = body.entries ?? []

      return (
        <KeyValueTable
          ariaLabel={`${field.label} URL 编码参数`}
          value={entries}
          availableVariables={availableVariables}
          disabled={disabled}
          entryErrors={getKeyValueEntryErrors(errors, entriesPath, entries.length)}
          onChange={(nextEntries) =>
            onChange({
              type: 'x-www-form-urlencoded',
              entries: nextEntries,
            })
          }
        />
      )
    }

    if (body.type === 'form-data') {
      const entries = body.entries ?? []

      function updateEntry(entryIndex: number, nextEntry: HttpFormDataEntryInput) {
        onChange({
          type: 'form-data',
          entries: entries.map((entry, index) => (index === entryIndex ? nextEntry : entry)),
        })
      }

      const columns: EditableTableColumn<HttpFormDataEntryInput>[] = [
        {
          id: 'key',
          header: '键',
          width: '34%',
          renderCell: ({ row, rowIndex }) => (
            <VariableValueEditor
              variant="table-cell"
              value={row.key}
              availableVariables={availableVariables}
              disabled={disabled}
              error={getFieldError(errors, `${entriesPath}.${rowIndex}.key`)}
              label={`${field.label} 第 ${rowIndex + 1} 行键`}
              placeholder="输入 / 插入变量"
              onChange={(key) => updateEntry(rowIndex, { ...row, key })}
            />
          ),
        },
        {
          id: 'valueType',
          header: '类型',
          width: 88,
          renderCell: ({ row, rowIndex }) => (
            <Select
              value={row.valueType}
              disabled={disabled}
              onValueChange={(nextValueType) => {
                const valueType = HTTP_FORM_DATA_VALUE_TYPES.find(
                  (candidate) => candidate === nextValueType,
                )
                if (valueType) updateEntry(rowIndex, { ...row, valueType })
              }}
            >
              <SelectTrigger
                size="sm"
                className="aria-invalid:bg-destructive/5 h-9 w-full rounded-none border-transparent bg-transparent px-2.5 text-[13px] shadow-none hover:border-transparent focus-visible:border-transparent aria-invalid:border-transparent dark:aria-invalid:border-transparent"
                aria-label={`${field.label} 第 ${rowIndex + 1} 行类型`}
                aria-invalid={Boolean(
                  getFieldError(errors, `${entriesPath}.${rowIndex}.valueType`),
                )}
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent
                position="popper"
                align="start"
                sideOffset={4}
                className="w-(--radix-select-trigger-width)"
              >
                {HTTP_FORM_DATA_VALUE_TYPES.map((valueType) => (
                  <SelectItem key={valueType} value={valueType} className="text-[13px]">
                    {valueType}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ),
        },
        {
          id: 'value',
          header: '值',
          renderCell: ({ row, rowIndex }) => (
            <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_28px] items-center">
              <VariableValueEditor
                variant="table-cell"
                value={row.value}
                availableVariables={availableVariables}
                disabled={disabled}
                error={getFieldError(errors, `${entriesPath}.${rowIndex}.value`)}
                label={`${field.label} 第 ${rowIndex + 1} 行值`}
                placeholder="输入 / 插入变量"
                onChange={(nextValue) => updateEntry(rowIndex, { ...row, value: nextValue })}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                disabled={disabled}
                aria-label={`删除${field.label}第 ${rowIndex + 1} 行`}
                className="text-muted-foreground hover:text-destructive focus-visible:text-destructive opacity-0 transition-opacity group-focus-within/row:opacity-100 group-hover/row:opacity-100"
                onClick={() =>
                  onChange({
                    type: 'form-data',
                    entries: entries.filter((_, index) => index !== rowIndex),
                  })
                }
              >
                <Trash2 className="size-3.5" aria-hidden />
              </Button>
            </div>
          ),
        },
      ]

      return (
        <EditableTableField
          ariaLabel={`${field.label} Form Data`}
          columns={columns}
          rows={entries}
          disabled={disabled}
          addRowLabel={`添加${field.label} Form Data`}
          getRowKey={(entry) => entry.id}
          onAddRow={() =>
            onChange({
              type: 'form-data',
              entries: [...entries, createHttpFormDataEntry()],
            })
          }
        />
      )
    }

    const valueLabel = getBodyValueLabel(body.type)

    return (
      <div className="border-border bg-input overflow-hidden rounded-lg border-[0.5px]">
        <VariableValueEditor
          variant="table-cell"
          value={body.value}
          availableVariables={availableVariables}
          disabled={disabled}
          error={getFieldError(errors, `${name}.value`)}
          label={valueLabel}
          placeholder={getBodyValuePlaceholder(body.type)}
          onChange={(nextValue) =>
            onChange({
              type: body.type,
              value: nextValue,
            })
          }
        />
      </div>
    )
  }

  const content = renderBodyContent()

  return (
    <Form.Field
      label={field.label}
      description={field.description}
      error={error}
      required={field.required}
    >
      <div className="space-y-3">
        <div
          role="radiogroup"
          aria-label={`${field.label} 类型`}
          className="flex flex-wrap gap-x-4 gap-y-2"
        >
          {options.map((option) => (
            <label
              key={option.value}
              className={cn(
                'text-muted-foreground hover:text-foreground focus-within:text-foreground inline-flex cursor-pointer items-center gap-2 text-[13px] transition-colors',
                (disabled || option.disabled) && 'cursor-not-allowed opacity-50',
              )}
            >
              <input
                type="radio"
                name={name || generatedName}
                value={option.value}
                checked={body.type === option.value}
                disabled={disabled || option.disabled}
                required={field.required}
                className="peer sr-only"
                onChange={() => onChange(createHttpRequestBody(option.value))}
              />
              <span className="border-input-focus peer-checked:border-primary peer-focus-visible:border-primary after:bg-primary flex size-4 items-center justify-center rounded-full border transition-colors peer-disabled:cursor-not-allowed after:size-2 after:rounded-full after:opacity-0 after:transition-opacity peer-checked:after:opacity-100" />
              <span>{option.label}</span>
            </label>
          ))}
        </div>

        {content ? <div data-slot="request-body-content">{content}</div> : null}
      </div>
    </Form.Field>
  )
}
