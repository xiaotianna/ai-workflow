import {
  DATA_TYPE_VALUES,
  nodeOutputDefinitionsSchema,
  type DataType,
  type NodeOutputDefinition,
} from '@ai-workflow/core'
import { useFormData } from '@ai-workflow/shared/hooks/use-form-data'
import { validateFormByZod } from '@ai-workflow/shared/utils/validate-form-by-zod'
import { Badge } from '@ai-workflow/ui/components/badge'
import { Button } from '@ai-workflow/ui/components/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@ai-workflow/ui/components/dialog'
import { Form } from '@ai-workflow/ui/components/form'
import { Input } from '@ai-workflow/ui/components/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@ai-workflow/ui/components/select'
import { Textarea } from '@ai-workflow/ui/components/textarea'
import { Braces, Pencil, Plus, Trash2 } from 'lucide-react'
import { useRef, useState, type FormEvent } from 'react'

import type {
  NodeVariableFieldErrors,
  NodeVariableSectionRendererProps,
} from '../components/node-variable-section'

const DATA_TYPE_LABELS = {
  string: '字符串',
  number: '数字',
  boolean: '布尔值',
  json: 'JSON',
} satisfies Record<DataType, string>

const EMPTY_INPUT_VARIABLE = {
  key: '',
  label: '',
  dataType: 'string',
  description: '',
} satisfies NodeOutputDefinition

type InputVariableField = keyof NodeOutputDefinition
type TouchedFields = Partial<Record<InputVariableField, boolean>>

function getOutputError(
  errors: NodeVariableFieldErrors | undefined,
  index: number,
  field?: InputVariableField,
) {
  if (!errors) return undefined

  const path = field ? `${index}.${field}` : `${index}`
  const matchingEntry = Object.entries(errors).find(
    ([errorPath]) => errorPath === path || errorPath.startsWith(`${path}.`),
  )

  return matchingEntry?.[1]
}

export function StartInputVariablesEditor({
  section,
  outputs,
  outputErrors,
  disabled,
  onOutputsChange,
}: NodeVariableSectionRendererProps) {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingIndex, setEditingIndex] = useState<number | undefined>()
  const [touchedFields, setTouchedFields] = useState<TouchedFields>({})
  const keyInputRef = useRef<HTMLInputElement>(null)
  const { form, setForm, updateFormField, resetForm } =
    useFormData<NodeOutputDefinition>(EMPTY_INPUT_VARIABLE)

  const candidateIndex = editingIndex ?? outputs.length
  const candidateOutputs =
    editingIndex === undefined
      ? [...outputs, form]
      : outputs.map((output, index) => (index === editingIndex ? form : output))
  const validationResult = validateFormByZod(nodeOutputDefinitionsSchema, candidateOutputs)
  const formErrors = validationResult.success ? {} : validationResult.errors

  function resetDialogForm() {
    resetForm()
    setEditingIndex(undefined)
    setTouchedFields({})
  }

  function handleDialogOpenChange(open: boolean) {
    setDialogOpen(open)
    if (!open) resetDialogForm()
  }

  function openCreateDialog() {
    resetDialogForm()
    setDialogOpen(true)
  }

  function openEditDialog(index: number) {
    const output = outputs[index]
    if (!output) return

    setEditingIndex(index)
    setTouchedFields({})
    setForm({
      ...output,
      description: output.description ?? '',
    })
    setDialogOpen(true)
  }

  function markFieldTouched(field: InputVariableField) {
    setTouchedFields((currentFields) => ({
      ...currentFields,
      [field]: true,
    }))
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const result = validateFormByZod(nodeOutputDefinitionsSchema, candidateOutputs)
    if (!result.success) {
      setTouchedFields({
        key: true,
        label: true,
        dataType: true,
        description: true,
      })
      return
    }

    onOutputsChange(result.data)
    setDialogOpen(false)
    resetDialogForm()
  }

  return (
    <section className="space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-sm font-medium">{section.label}</h3>
          {section.description ? (
            <p className="text-muted-foreground mt-1 text-xs leading-4">{section.description}</p>
          ) : null}
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          disabled={disabled}
          aria-label={`添加${section.label}`}
          onClick={openCreateDialog}
        >
          <Plus aria-hidden />
        </Button>
      </div>

      {outputs.length === 0 ? (
        <p className="text-muted-foreground rounded-lg border border-dashed px-3 py-4 text-center text-xs">
          暂未配置{section.label}
        </p>
      ) : (
        <div className="space-y-2">
          {outputs.map((output, index) => {
            const error = getOutputError(outputErrors, index)

            return (
              <div key={`${output.key}-${index}`}>
                <div
                  className="border-border/60 bg-background flex min-w-0 items-center gap-1 rounded-lg border-[0.5px] p-1 shadow-xs"
                  aria-invalid={Boolean(error)}
                >
                  <button
                    type="button"
                    className="hover:bg-muted focus-visible:bg-muted flex min-w-0 flex-1 cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-left outline-none disabled:cursor-not-allowed disabled:opacity-50"
                    disabled={disabled}
                    aria-label={`编辑输入变量 ${output.key}`}
                    onClick={() => openEditDialog(index)}
                  >
                    <Braces className="text-primary size-4 shrink-0" aria-hidden />
                    <span className="min-w-0 flex-1 truncate text-sm font-medium">
                      {output.key}
                      {output.label !== output.key ? (
                        <span className="text-muted-foreground font-normal"> · {output.label}</span>
                      ) : null}
                    </span>
                    <Badge variant="outline" className="shrink-0">
                      {output.dataType}
                    </Badge>
                  </button>

                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    className="text-muted-foreground"
                    disabled={disabled}
                    aria-label={`编辑输入变量 ${output.key}`}
                    onClick={() => openEditDialog(index)}
                  >
                    <Pencil aria-hidden />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    className="text-muted-foreground hover:text-destructive focus-visible:text-destructive"
                    disabled={disabled}
                    aria-label={`删除输入变量 ${output.key}`}
                    onClick={() =>
                      onOutputsChange(
                        outputs.filter((_output, outputIndex) => outputIndex !== index),
                      )
                    }
                  >
                    <Trash2 aria-hidden />
                  </Button>
                </div>
                {error ? <p className="text-destructive mt-1 text-xs leading-4">{error}</p> : null}
              </div>
            )
          })}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={handleDialogOpenChange}>
        <DialogContent
          aria-describedby={undefined}
          onOpenAutoFocus={(event) => {
            event.preventDefault()
            keyInputRef.current?.focus()
          }}
        >
          <DialogHeader>
            <DialogTitle>
              {editingIndex === undefined ? '添加输入变量' : '编辑输入变量'}
            </DialogTitle>
          </DialogHeader>

          <Form onSubmit={handleSubmit}>
            <Form.Field
              required
              label="变量 Key"
              error={
                touchedFields.key ? getOutputError(formErrors, candidateIndex, 'key') : undefined
              }
              description="使用字母或下划线开头，仅支持字母、数字和下划线"
            >
              <Input
                ref={keyInputRef}
                value={form.key}
                disabled={disabled}
                aria-label="输入变量 Key"
                aria-invalid={Boolean(
                  touchedFields.key && getOutputError(formErrors, candidateIndex, 'key'),
                )}
                autoComplete="off"
                placeholder="例如：user_query"
                onChange={(event) => updateFormField('key', event.currentTarget.value)}
                onBlur={() => markFieldTouched('key')}
              />
            </Form.Field>

            <Form.Field
              required
              label="显示名称"
              error={
                touchedFields.label
                  ? getOutputError(formErrors, candidateIndex, 'label')
                  : undefined
              }
            >
              <Input
                value={form.label}
                disabled={disabled}
                aria-label="输入变量显示名称"
                aria-invalid={Boolean(
                  touchedFields.label && getOutputError(formErrors, candidateIndex, 'label'),
                )}
                autoComplete="off"
                placeholder="例如：用户问题"
                onChange={(event) => updateFormField('label', event.currentTarget.value)}
                onBlur={() => markFieldTouched('label')}
              />
            </Form.Field>

            <Form.Field
              required
              label="数据类型"
              error={
                touchedFields.dataType
                  ? getOutputError(formErrors, candidateIndex, 'dataType')
                  : undefined
              }
            >
              <Select
                value={form.dataType}
                disabled={disabled}
                onValueChange={(value) => {
                  const dataType = DATA_TYPE_VALUES.find((candidate) => candidate === value)
                  if (dataType) updateFormField('dataType', dataType)
                }}
              >
                <SelectTrigger
                  className="w-full"
                  aria-label="输入变量数据类型"
                  aria-invalid={Boolean(
                    touchedFields.dataType &&
                    getOutputError(formErrors, candidateIndex, 'dataType'),
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
                  {DATA_TYPE_VALUES.map((dataType) => (
                    <SelectItem key={dataType} value={dataType}>
                      {DATA_TYPE_LABELS[dataType]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Form.Field>

            <Form.Field
              label="说明"
              error={
                touchedFields.description
                  ? getOutputError(formErrors, candidateIndex, 'description')
                  : undefined
              }
            >
              <Textarea
                value={form.description ?? ''}
                disabled={disabled}
                aria-label="输入变量说明（可选）"
                aria-invalid={Boolean(
                  touchedFields.description &&
                  getOutputError(formErrors, candidateIndex, 'description'),
                )}
                placeholder="补充该变量的用途"
                className="min-h-20 resize-none"
                onChange={(event) => updateFormField('description', event.currentTarget.value)}
                onBlur={() => markFieldTouched('description')}
              />
            </Form.Field>

            <DialogFooter className="pt-1">
              <DialogClose asChild>
                <Button type="button" variant="secondary" size="sm">
                  取消
                </Button>
              </DialogClose>
              <Button
                type="submit"
                variant="confirm"
                size="sm"
                disabled={disabled || !validationResult.success}
              >
                {editingIndex === undefined ? '添加' : '保存'}
              </Button>
            </DialogFooter>
          </Form>
        </DialogContent>
      </Dialog>
    </section>
  )
}
