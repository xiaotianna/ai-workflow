import {
  nodeOutputDefinitionSchema,
  nodeOutputDefinitionsSchema,
  type NodeOutputDefinition,
} from '@ai-workflow/core'
import { useFormData } from '@ai-workflow/shared/hooks/use-form-data'
import { validateFormByZod } from '@ai-workflow/shared/utils/validate-form-by-zod'
import { Button } from '@ai-workflow/ui/components/button'
import { Checkbox } from '@ai-workflow/ui/components/checkbox'
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
import { VariableIcon } from '@ai-workflow/ui/components/variable-icon'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@ai-workflow/ui/components/select'
import { Textarea } from '@ai-workflow/ui/components/textarea'
import { PencilLine, Plus, Trash2 } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { z } from 'zod'

import { DataTypeIcon, DataTypeSelect } from '../components/data-type-select'
import type {
  NodeVariableFieldErrors,
  NodeVariableSectionRendererProps,
} from '../components/node-variable-section'

const startInputVariableFormSchema = z
  .object({
    key: nodeOutputDefinitionSchema.shape.key,
    label: nodeOutputDefinitionSchema.shape.label,
    dataType: nodeOutputDefinitionSchema.shape.dataType,
    description: nodeOutputDefinitionSchema.shape.description,
    defaultValue: z.string(),
    required: z.boolean(),
  })
  .transform((value, context): NodeOutputDefinition => {
    const { defaultValue, description, ...output } = value
    let parsedDefaultValue: NodeOutputDefinition['defaultValue'] = undefined

    if (defaultValue !== '') {
      if (value.dataType === 'number') {
        const numberValue = Number(defaultValue)

        if (!Number.isFinite(numberValue)) {
          context.addIssue({
            code: 'custom',
            path: ['defaultValue'],
            message: '请输入有效数字',
          })
          return z.NEVER
        }

        parsedDefaultValue = numberValue
      } else if (value.dataType === 'boolean') {
        parsedDefaultValue = defaultValue === 'true'
      } else if (value.dataType === 'json') {
        try {
          parsedDefaultValue = JSON.parse(defaultValue) as NodeOutputDefinition['defaultValue']
        } catch {
          context.addIssue({
            code: 'custom',
            path: ['defaultValue'],
            message: '请输入有效的 JSON',
          })
          return z.NEVER
        }
      } else {
        parsedDefaultValue = defaultValue
      }
    }

    return {
      ...output,
      ...(description?.trim() ? { description } : {}),
      ...(parsedDefaultValue !== undefined ? { defaultValue: parsedDefaultValue } : {}),
    }
  })
  .pipe(nodeOutputDefinitionSchema)

type InputVariableFormInput = z.input<typeof startInputVariableFormSchema>

const EMPTY_INPUT_VARIABLE = {
  key: '',
  label: '',
  dataType: 'string',
  description: '',
  defaultValue: '',
  required: true,
} satisfies InputVariableFormInput

type InputVariableField = Exclude<keyof InputVariableFormInput, 'description'>
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

function getDefaultValueInput(output: NodeOutputDefinition) {
  if (output.defaultValue === undefined) return ''
  if (output.dataType === 'json') return JSON.stringify(output.defaultValue, null, 2)
  return String(output.defaultValue)
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
  const { form, setForm, updateFormField, updateForm, resetForm } =
    useFormData<InputVariableFormInput>(EMPTY_INPUT_VARIABLE)

  const candidateIndex = editingIndex ?? outputs.length
  const formValidation = validateFormByZod(startInputVariableFormSchema, form)
  const candidateOutputs = formValidation.success
    ? editingIndex === undefined
      ? [...outputs, formValidation.data]
      : outputs.map((output, index) => (index === editingIndex ? formValidation.data : output))
    : undefined
  const outputsValidation = candidateOutputs
    ? validateFormByZod(nodeOutputDefinitionsSchema, candidateOutputs)
    : undefined
  const canSubmit = formValidation.success && outputsValidation?.success === true

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
      key: output.key,
      label: output.label,
      dataType: output.dataType,
      description: output.description ?? '',
      defaultValue: getDefaultValueInput(output),
      required: output.required ?? true,
    })
    setDialogOpen(true)
  }

  function markFieldTouched(field: InputVariableField) {
    setTouchedFields((currentFields) => ({
      ...currentFields,
      [field]: true,
    }))
  }

  function getFieldError(field: InputVariableField) {
    if (!touchedFields[field]) return undefined

    if (!formValidation.success) {
      const error = formValidation.errors[field]
      if (error) return error
    }

    if (outputsValidation && !outputsValidation.success) {
      return getOutputError(outputsValidation.errors, candidateIndex, field)
    }

    return undefined
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const parsedForm = validateFormByZod(startInputVariableFormSchema, form)
    if (!parsedForm.success) {
      setTouchedFields({
        key: true,
        label: true,
        dataType: true,
        defaultValue: true,
        required: true,
      })
      return
    }

    const nextOutputs =
      editingIndex === undefined
        ? [...outputs, parsedForm.data]
        : outputs.map((output, index) => (index === editingIndex ? parsedForm.data : output))
    const parsedOutputs = validateFormByZod(nodeOutputDefinitionsSchema, nextOutputs)

    if (!parsedOutputs.success) {
      setTouchedFields({
        key: true,
        label: true,
        dataType: true,
        defaultValue: true,
        required: true,
      })
      return
    }

    onOutputsChange(parsedOutputs.data)
    setDialogOpen(false)
    resetDialogForm()
  }

  return (
    <>
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
            onClick={openCreateDialog}
          >
            <Plus className="size-4" aria-hidden />
          </Button>
        }
      >
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
                    className="group/variable border-border/60 bg-background aria-invalid:border-destructive relative flex h-8 min-w-0 overflow-hidden rounded-lg border-[0.5px] shadow-xs transition-shadow hover:shadow-md"
                    aria-invalid={Boolean(error)}
                  >
                    <div className="flex min-w-0 flex-1 items-center gap-1 px-2.5">
                      <VariableIcon className="text-primary size-3.5 shrink-0" />
                      <span
                        title={output.key}
                        className="text-foreground/80 max-w-32.5 shrink-0 truncate text-[13px] font-medium"
                      >
                        {output.key}
                      </span>
                      <span
                        className="text-muted-foreground shrink-0 text-xs font-medium"
                        aria-hidden
                      >
                        ·
                      </span>
                      <span
                        title={output.label}
                        className="text-muted-foreground min-w-0 flex-1 truncate text-[13px] font-medium"
                      >
                        {output.label}
                      </span>
                      <span className="text-muted-foreground ml-2 flex w-14 shrink-0 items-center justify-end gap-1.5 transition-opacity group-focus-within/variable:opacity-0 group-hover/variable:opacity-0">
                        {output.required ? <span className="text-xs font-normal">必填</span> : null}
                        <DataTypeIcon dataType={output.dataType} />
                      </span>
                    </div>

                    <div className="pointer-events-none absolute inset-y-0 right-1 flex items-center gap-1 opacity-0 transition-opacity group-focus-within/variable:pointer-events-auto group-focus-within/variable:opacity-100 group-hover/variable:pointer-events-auto group-hover/variable:opacity-100">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-xs"
                        className="text-muted-foreground"
                        disabled={disabled}
                        aria-label={`编辑输入变量 ${output.key}`}
                        onClick={() => openEditDialog(index)}
                      >
                        <PencilLine className="size-4" aria-hidden />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-xs"
                        className="text-destructive hover:bg-destructive/10 hover:text-destructive focus-visible:bg-destructive/10 focus-visible:text-destructive"
                        disabled={disabled}
                        aria-label={`删除输入变量 ${output.key}`}
                        onClick={() =>
                          onOutputsChange(
                            outputs.filter((_output, outputIndex) => outputIndex !== index),
                          )
                        }
                      >
                        <Trash2 className="size-4" aria-hidden />
                      </Button>
                    </div>
                  </div>
                  {error ? (
                    <p className="text-destructive mt-1 text-xs leading-4">{error}</p>
                  ) : null}
                </div>
              )
            })}
          </div>
        )}
      </Form.Field>

      <Dialog open={dialogOpen} onOpenChange={handleDialogOpenChange}>
        <DialogContent aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>{editingIndex === undefined ? '新增变量' : '编辑变量'}</DialogTitle>
          </DialogHeader>

          <Form onSubmit={handleSubmit}>
            <Form.Field required label="字段类型" error={getFieldError('dataType')}>
              <DataTypeSelect
                value={form.dataType}
                disabled={disabled}
                aria-label="输入变量字段类型"
                aria-invalid={Boolean(getFieldError('dataType'))}
                onValueChange={(dataType) => {
                  updateForm({
                    dataType,
                    defaultValue: '',
                  })
                }}
              />
            </Form.Field>

            <Form.Field
              required
              label="变量名称"
              error={getFieldError('key')}
              description="使用字母或下划线开头，仅支持字母、数字和下划线"
            >
              <Input
                value={form.key}
                disabled={disabled}
                aria-label="输入变量名称"
                aria-invalid={Boolean(getFieldError('key'))}
                autoComplete="off"
                placeholder="例如：user_query"
                onChange={(event) => updateFormField('key', event.currentTarget.value)}
                onBlur={() => markFieldTouched('key')}
              />
            </Form.Field>

            <Form.Field required label="显示名称" error={getFieldError('label')}>
              <Input
                value={form.label}
                disabled={disabled}
                aria-label="输入变量显示名称"
                aria-invalid={Boolean(getFieldError('label'))}
                autoComplete="off"
                placeholder="例如：用户问题"
                onChange={(event) => updateFormField('label', event.currentTarget.value)}
                onBlur={() => markFieldTouched('label')}
              />
            </Form.Field>

            <Form.Field label="默认值" error={getFieldError('defaultValue')}>
              {form.dataType === 'boolean' ? (
                <Select
                  value={form.defaultValue || 'unset'}
                  disabled={disabled}
                  onValueChange={(value) =>
                    updateFormField('defaultValue', value === 'unset' ? '' : value)
                  }
                >
                  <SelectTrigger
                    className="w-full"
                    aria-label="输入变量默认值（可选）"
                    aria-invalid={Boolean(getFieldError('defaultValue'))}
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent
                    position="popper"
                    align="start"
                    sideOffset={4}
                    className="w-(--radix-select-trigger-width)"
                  >
                    <SelectItem value="unset">未设置</SelectItem>
                    <SelectItem value="true">是</SelectItem>
                    <SelectItem value="false">否</SelectItem>
                  </SelectContent>
                </Select>
              ) : form.dataType === 'json' ? (
                <Textarea
                  value={form.defaultValue}
                  disabled={disabled}
                  aria-label="输入变量默认值（可选）"
                  aria-invalid={Boolean(getFieldError('defaultValue'))}
                  placeholder={'例如：{"key":"value"}'}
                  className="min-h-20 resize-none font-mono text-xs"
                  onChange={(event) => updateFormField('defaultValue', event.currentTarget.value)}
                  onBlur={() => markFieldTouched('defaultValue')}
                />
              ) : (
                <Input
                  type={form.dataType === 'number' ? 'number' : 'text'}
                  step={form.dataType === 'number' ? 'any' : undefined}
                  value={form.defaultValue}
                  disabled={disabled}
                  aria-label="输入变量默认值（可选）"
                  aria-invalid={Boolean(getFieldError('defaultValue'))}
                  autoComplete="off"
                  placeholder={form.dataType === 'number' ? '请输入数字' : '请输入默认值'}
                  onChange={(event) => updateFormField('defaultValue', event.currentTarget.value)}
                  onBlur={() => markFieldTouched('defaultValue')}
                />
              )}
            </Form.Field>

            <fieldset className="min-w-0 border-0 p-0">
              <legend className="sr-only">变量选项</legend>
              <label className="group/field flex w-fit cursor-pointer items-center gap-2.5 text-sm font-medium">
                <Checkbox
                  checked={form.required}
                  disabled={disabled}
                  aria-label="必填"
                  onCheckedChange={(checked) => updateFormField('required', checked === true)}
                />
                <span>必填</span>
              </label>
            </fieldset>

            <DialogFooter className="pt-2">
              <DialogClose asChild>
                <Button type="button" variant="secondary" size="sm">
                  取消
                </Button>
              </DialogClose>
              <Button type="submit" variant="confirm" size="sm" disabled={disabled || !canSubmit}>
                保存
              </Button>
            </DialogFooter>
          </Form>
        </DialogContent>
      </Dialog>
    </>
  )
}
