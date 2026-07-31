import { llmModelParametersSchema, type LlmModelParametersInput } from '@ai-workflow/core'
import { useFormData } from '@ai-workflow/shared/hooks/use-form-data'
import { validateFormByZod } from '@ai-workflow/shared/utils/validate-form-by-zod'
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
import { Slider } from '@ai-workflow/ui/components/slider'
import { Plus, Trash2 } from 'lucide-react'
import { AnimatePresence, motion, MotionConfig } from 'motion/react'
import { useState, type ComponentType, type FormEvent } from 'react'

import type { ModelProviderType } from '@/api/models'
import {
  getModelParameterDefinitions,
  normalizeModelParameters,
  type ModelParameterControl,
  type ModelParameterDefinition,
  type ModelParameterValue,
} from '@/features/models'

interface LlmModelParametersDialogProps {
  modelId: string
  modelName: string
  onOpenChange: (open: boolean) => void
  onSave: (parameters: LlmModelParametersInput) => void
  open: boolean
  providerType: ModelProviderType
  value: LlmModelParametersInput
}

interface ParameterControlProps {
  definition: ModelParameterDefinition
  getError: (path?: string) => string | undefined
  onBlur: (path?: string) => void
  onChange: (value: ModelParameterValue) => void
  value: ModelParameterValue
}

const parameterControlRenderers = {
  number: NumberParameterControl,
  select: SelectParameterControl,
  slider: SliderParameterControl,
  'string-list': StringListParameterControl,
} satisfies Record<ModelParameterControl, ComponentType<ParameterControlProps>>

export function LlmModelParametersDialog({
  modelId,
  modelName,
  onOpenChange,
  onSave,
  open,
  providerType,
  value,
}: LlmModelParametersDialogProps) {
  const { form, setForm, updateFormField } = useFormData<LlmModelParametersInput>(value)
  const [touchedFields, setTouchedFields] = useState<Record<string, boolean>>({})
  const [submitted, setSubmitted] = useState(false)
  const validationResult = validateFormByZod(llmModelParametersSchema, form)
  const definitions = getModelParameterDefinitions(providerType, {
    modelId,
    parameters: form,
  })

  function updateParameter(key: keyof LlmModelParametersInput, nextValue: ModelParameterValue) {
    updateFormField(key, nextValue)
  }

  function markParameterTouched(key: keyof LlmModelParametersInput, path?: string) {
    setTouchedFields((currentFields) => ({
      ...currentFields,
      [path ?? key]: true,
    }))
  }

  function getParameterError(key: keyof LlmModelParametersInput, path?: string) {
    if (path) {
      return submitted || touchedFields[path] ? validationResult.errors[path] : undefined
    }

    const directError = validationResult.errors[key]
    if (directError && (submitted || touchedFields[key])) return directError

    return Object.entries(validationResult.errors).find(
      ([errorPath]) => errorPath.startsWith(`${key}.`) && (submitted || touchedFields[errorPath]),
    )?.[1]
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitted(true)

    const result = validateFormByZod(llmModelParametersSchema, form)
    if (!result.success) return

    onSave(normalizeModelParameters(providerType, modelId, result.data))
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[min(720px,calc(100vh-2rem))] max-w-lg flex-col">
        <DialogHeader>
          <DialogTitle className="truncate">模型参数 · {modelName}</DialogTitle>
        </DialogHeader>

        <Form className="flex min-h-0 flex-1 flex-col gap-4 space-y-0" onSubmit={handleSubmit}>
          <div className="-mx-1 min-h-0 flex-1 space-y-4 overflow-y-auto px-1 py-0.5">
            {definitions.map((definition) => {
              const parameterValue = form[definition.key]
              const ParameterControl = parameterControlRenderers[definition.control]

              return (
                <Form.Field
                  key={definition.key}
                  label={definition.label}
                  error={getParameterError(definition.key)}
                  className="w-full"
                >
                  <ParameterControl
                    definition={definition}
                    value={parameterValue ?? definition.initialValue}
                    getError={(path) => getParameterError(definition.key, path)}
                    onBlur={(path) => markParameterTouched(definition.key, path)}
                    onChange={(nextValue) => updateParameter(definition.key, nextValue)}
                  />
                </Form.Field>
              )
            })}
          </div>

          <DialogFooter className="pt-1">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setForm({})
                setTouchedFields({})
                setSubmitted(false)
              }}
            >
              恢复默认
            </Button>
            <DialogClose asChild>
              <Button type="button" variant="secondary">
                取消
              </Button>
            </DialogClose>
            <Button type="submit" variant="confirm" disabled={!validationResult.success}>
              保存
            </Button>
          </DialogFooter>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

function NumberParameterControl({
  definition,
  getError,
  onBlur,
  onChange,
  value,
}: ParameterControlProps) {
  const numericValue = typeof value === 'number' ? value : 0
  const error = getError()

  return (
    <Input
      type="number"
      value={numericValue}
      min={definition.min}
      max={definition.max}
      step={definition.step}
      placeholder={definition.placeholder}
      aria-label={definition.label}
      aria-invalid={Boolean(error)}
      onBlur={() => onBlur()}
      onChange={(event) => onChange(event.currentTarget.valueAsNumber || 0)}
    />
  )
}

function SelectParameterControl({
  definition,
  getError,
  onBlur,
  onChange,
  value,
}: ParameterControlProps) {
  const error = getError()

  return (
    <Select
      value={String(value)}
      onValueChange={(nextValue) => {
        const selectedOption = definition.options?.find((option) => option.value === nextValue)
        if (selectedOption) onChange(selectedOption.value)
      }}
    >
      <SelectTrigger
        aria-label={definition.label}
        aria-invalid={Boolean(error)}
        className="w-full"
        onBlur={() => onBlur()}
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent
        position="popper"
        align="start"
        sideOffset={4}
        className="w-(--radix-select-trigger-width)"
      >
        {definition.options?.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

function SliderParameterControl({
  definition,
  getError,
  onBlur,
  onChange,
  value,
}: ParameterControlProps) {
  const numericValue = typeof value === 'number' ? value : 0
  const error = getError()

  return (
    <div className="flex w-full items-center gap-3">
      <Slider
        value={[numericValue]}
        min={definition.min}
        max={definition.max}
        step={definition.step}
        aria-label={definition.label}
        className="min-w-0 flex-1"
        onBlur={() => onBlur()}
        onValueChange={(values) => onChange(values[0] ?? numericValue)}
      />
      <Input
        type="number"
        value={numericValue}
        min={definition.min}
        max={definition.max}
        step={definition.step}
        aria-label={`${definition.label}数值`}
        aria-invalid={Boolean(error)}
        className="w-20 shrink-0"
        onBlur={() => onBlur()}
        onChange={(event) => onChange(event.currentTarget.valueAsNumber || 0)}
      />
    </div>
  )
}

function StringListParameterControl({
  definition,
  getError,
  onBlur,
  onChange,
  value,
}: ParameterControlProps) {
  const values = Array.isArray(value) ? value : []
  const canAdd = values.length < (definition.maxItems ?? Number.POSITIVE_INFINITY)

  function updateItem(index: number, nextValue: string) {
    onChange(values.map((item, itemIndex) => (itemIndex === index ? nextValue : item)))
  }

  function removeItem(index: number) {
    onChange(values.filter((_, itemIndex) => itemIndex !== index))
  }

  return (
    <MotionConfig transition={{ duration: 0.16, ease: 'easeOut' }}>
      <div className="w-full space-y-2">
        <AnimatePresence initial={false} mode="popLayout">
          {values.map((item, index) => (
            <motion.div
              layout
              key={index}
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              className="flex w-full items-center gap-2"
            >
              <Input
                value={item}
                placeholder={definition.placeholder}
                aria-label={`${definition.label} ${index + 1}`}
                aria-invalid={Boolean(getError(`${definition.key}.${index}`))}
                onBlur={() => onBlur(`${definition.key}.${index}`)}
                onChange={(event) => updateItem(index, event.target.value)}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive focus-visible:bg-destructive/10 focus-visible:text-destructive"
                aria-label={`删除停止序列 ${index + 1}`}
                onClick={() => removeItem(index)}
              >
                <Trash2 aria-hidden />
              </Button>
            </motion.div>
          ))}
        </AnimatePresence>

        <Button
          type="button"
          variant="secondary"
          size="sm"
          disabled={!canAdd}
          className="w-full"
          onClick={() => onChange([...values, ''])}
        >
          <Plus aria-hidden />
          添加停止序列
        </Button>
      </div>
    </MotionConfig>
  )
}
