import {
  ENVIRONMENT_VARIABLE_TYPES,
  environmentVariableTypeSchema,
  workflowEnvironmentVariableSchema,
  type EnvironmentVariableType,
  type WorkflowEnvironmentVariable,
} from '@ai-workflow/core'
import { useFormData } from '@ai-workflow/shared/hooks/use-form-data'
import { generateUuid } from '@ai-workflow/shared/utils/uuid'
import { validateFormByZod } from '@ai-workflow/shared/utils/validate-form-by-zod'
import { Button } from '@ai-workflow/ui/components/button'
import { Form } from '@ai-workflow/ui/components/form'
import { Input } from '@ai-workflow/ui/components/input'
import { PopoverContent } from '@ai-workflow/ui/components/popover'
import { Textarea } from '@ai-workflow/ui/components/textarea'
import { cn } from '@ai-workflow/ui/lib/utils'
import { CircleHelp, X } from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'

import { Tooltip } from '@/components/tooltip'
import {
  createEnvironmentVariableFormSchema,
  getEnvironmentVariableFormInitialValues,
  type EnvironmentVariableFormInput,
} from '../schema'
import { ENVIRONMENT_VARIABLE_TYPE_LABELS } from '../utils/workflow-variable-presentation'

const ENVIRONMENT_VARIABLE_TYPE_OPTIONS = environmentVariableTypeSchema.options

interface WorkflowEnvironmentVariablePopoverProps {
  open: boolean
  variable?: WorkflowEnvironmentVariable
  variables: readonly WorkflowEnvironmentVariable[]
  alignOffset: number
  onOpenChange: (open: boolean) => void
  onSubmit: (variable: WorkflowEnvironmentVariable) => void
}

export function WorkflowEnvironmentVariablePopover({
  open,
  variable,
  variables,
  alignOffset,
  onOpenChange,
  onSubmit,
}: WorkflowEnvironmentVariablePopoverProps) {
  const initialValues = getEnvironmentVariableFormInitialValues(variable)
  const { form, setForm, updateFormField } =
    useFormData<EnvironmentVariableFormInput>(initialValues)
  const [touchedFields, setTouchedFields] = useState<
    Partial<Record<keyof EnvironmentVariableFormInput, boolean>>
  >({})
  const schema = createEnvironmentVariableFormSchema({
    variables,
    editingVariableId: variable?.id,
  })
  const validationResult = validateFormByZod(schema, form)
  const formErrors = validationResult.errors
  const title = variable ? '编辑环境变量' : '添加环境变量'

  useEffect(() => {
    if (!open) return

    setForm(getEnvironmentVariableFormInitialValues(variable))
    setTouchedFields({})
  }, [open, setForm, variable])

  function markFieldTouched(field: keyof EnvironmentVariableFormInput) {
    setTouchedFields((currentFields) => ({
      ...currentFields,
      [field]: true,
    }))
  }

  function closePopover() {
    setTouchedFields({})
    onOpenChange(false)
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const result = validateFormByZod(schema, form)
    if (!result.success) {
      setTouchedFields({
        type: true,
        name: true,
        value: true,
        description: true,
      })
      return
    }

    const parsedVariable = workflowEnvironmentVariableSchema.parse({
      id: variable?.id ?? generateUuid(),
      ...result.data,
    })

    onSubmit(parsedVariable)
    closePopover()
  }

  return (
    <PopoverContent
      side="left"
      align="start"
      alignOffset={alignOffset}
      sideOffset={8}
      collisionPadding={16}
      aria-label={title}
      className="max-h-[calc(100vh-2rem)] w-96 max-w-[calc(100vw-2rem)] overflow-y-auto p-4"
      onOpenAutoFocus={(event) => event.preventDefault()}
    >
      <div className="flex min-w-0 items-center justify-between gap-3">
        <h3 className="text-foreground text-base leading-6 font-semibold">{title}</h3>
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          className="text-muted-foreground"
          aria-label={`关闭${title}`}
          onClick={closePopover}
        >
          <X className="size-4" aria-hidden />
        </Button>
      </div>

      <Form className="mt-4" onSubmit={handleSubmit}>
        <Form.Field required label="类型" error={formErrors.type}>
          <div className="grid grid-cols-3 gap-2">
            {ENVIRONMENT_VARIABLE_TYPE_OPTIONS.map((type) => {
              const selected = form.type === type

              return (
                <Button
                  key={type}
                  type="button"
                  variant="outline"
                  aria-pressed={selected}
                  className={cn(
                    'h-8 rounded-lg px-2 text-[13px] font-medium shadow-none transition-[background-color,border-color,color]',
                    selected
                      ? 'border-primary text-foreground bg-background hover:bg-background focus-visible:bg-background'
                      : 'bg-input text-muted-foreground hover:border-input-focus hover:bg-background focus-visible:border-input-focus focus-visible:bg-background',
                  )}
                  onClick={() => updateFormField('type', type as EnvironmentVariableType)}
                >
                  {ENVIRONMENT_VARIABLE_TYPE_LABELS[type]}
                  {type === ENVIRONMENT_VARIABLE_TYPES.SECRET ? (
                    <Tooltip content="Secret 值由服务端脱敏为 8 个 *，填写新值才会替换原值；导出 DSL 时不会包含原值">
                      <CircleHelp
                        className="text-muted-foreground size-3.5"
                        aria-label="Secret 说明"
                      />
                    </Tooltip>
                  ) : null}
                </Button>
              )
            })}
          </div>
        </Form.Field>

        <Form.Field required label="名称" error={touchedFields.name ? formErrors.name : undefined}>
          <Input
            value={form.name}
            maxLength={64}
            autoComplete="off"
            placeholder="变量名"
            aria-label="环境变量名称"
            aria-invalid={Boolean(touchedFields.name && formErrors.name)}
            className="h-8 rounded-lg px-3 text-sm"
            onBlur={() => markFieldTouched('name')}
            onChange={(event) => updateFormField('name', event.currentTarget.value)}
          />
        </Form.Field>

        <Form.Field required label="值" error={touchedFields.value ? formErrors.value : undefined}>
          {form.type === ENVIRONMENT_VARIABLE_TYPES.NUMBER ? (
            <Input
              type="number"
              step="any"
              value={form.value}
              placeholder="变量值"
              aria-label="环境变量值"
              aria-invalid={Boolean(touchedFields.value && formErrors.value)}
              className="h-8 rounded-lg px-3 text-sm"
              onBlur={() => markFieldTouched('value')}
              onChange={(event) => updateFormField('value', event.currentTarget.value)}
            />
          ) : (
            <Textarea
              value={form.value}
              placeholder="变量值"
              aria-label="环境变量值"
              aria-invalid={Boolean(touchedFields.value && formErrors.value)}
              className="min-h-20 resize-none rounded-lg px-3 py-2 text-sm"
              onBlur={() => markFieldTouched('value')}
              onChange={(event) => updateFormField('value', event.currentTarget.value)}
            />
          )}
        </Form.Field>

        <Form.Field
          label="描述"
          error={touchedFields.description ? formErrors.description : undefined}
        >
          <Textarea
            value={form.description}
            maxLength={200}
            placeholder="变量的描述"
            aria-label="环境变量描述（可选）"
            aria-invalid={Boolean(touchedFields.description && formErrors.description)}
            className="min-h-16 resize-none rounded-lg px-3 py-2 text-sm"
            onBlur={() => markFieldTouched('description')}
            onChange={(event) => updateFormField('description', event.currentTarget.value)}
          />
        </Form.Field>

        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="secondary" size="sm" onClick={closePopover}>
            取消
          </Button>
          <Button type="submit" variant="confirm" size="sm" disabled={!validationResult.success}>
            保存
          </Button>
        </div>
      </Form>
    </PopoverContent>
  )
}
