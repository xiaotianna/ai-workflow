import { jsonValueSchema, type JsonValue } from '@ai-workflow/core'
import { useFormData } from '@ai-workflow/shared/hooks/use-form-data'
import { validateFormByZod } from '@ai-workflow/shared/utils/validate-form-by-zod'
import { CodeEditor } from '@ai-workflow/ui/components/code-editor'
import { cn } from '@ai-workflow/ui/lib/utils'
import { useEffect, useRef } from 'react'
import { z } from 'zod'

const jsonValueInputSchema = z.object({
  value: z.string().transform((value, context): JsonValue => {
    try {
      const parsedValue = JSON.parse(value) as unknown,
        result = jsonValueSchema.safeParse(parsedValue)

      if (result.success) return result.data
    } catch {
      // 统一由下方 Zod issue 提供错误文案。
    }

    context.addIssue({
      code: 'custom',
      message: '请输入有效的 JSON',
    })
    return z.NEVER
  }),
})

export interface JsonValueInputProps {
  name: string
  value: JsonValue
  disabled?: boolean
  onChange: (value: JsonValue) => void
}

function formatJsonValue(value: JsonValue) {
  return JSON.stringify(value, null, 2)
}

export function JsonValueInput({ name, value, disabled, onChange }: JsonValueInputProps) {
  const serializedValue = formatJsonValue(value),
    pendingSerializedValueRef = useRef<string>(undefined),
    { form, setForm, updateFormField } = useFormData({ value: serializedValue }),
    validation = validateFormByZod(jsonValueInputSchema, form),
    error = validation.success ? undefined : validation.errors.value

  useEffect(() => {
    if (pendingSerializedValueRef.current === serializedValue) {
      pendingSerializedValueRef.current = undefined
      return
    }

    setForm((currentForm) =>
      currentForm.value === serializedValue ? currentForm : { value: serializedValue },
    )
  }, [serializedValue, setForm])

  function handleChange(nextValue: string) {
    updateFormField('value', nextValue)
    const result = validateFormByZod(jsonValueInputSchema, { value: nextValue })

    if (result.success) {
      pendingSerializedValueRef.current = formatJsonValue(result.data.value)
      onChange(result.data.value)
    }
  }

  return (
    <div>
      <div
        role="group"
        data-disabled={disabled}
        aria-disabled={disabled}
        aria-label="异常处理默认值"
        aria-invalid={Boolean(error)}
        className={cn(
          'bg-input hover:border-input-focus focus-within:border-input-focus aria-invalid:border-destructive dark:aria-invalid:border-destructive/70 flex h-52 w-full overflow-hidden rounded-lg border border-transparent shadow-none transition-[border-color] outline-none',
          disabled && 'cursor-not-allowed opacity-50',
        )}
      >
        <input type="hidden" name={name} value={form.value} disabled={disabled} />
        <CodeEditor
          aria-label="异常处理默认值"
          className="min-h-0 flex-1"
          disabled={disabled}
          language="json"
          value={form.value}
          options={{ formatOnPaste: false, formatOnType: false }}
          onChange={handleChange}
        />
      </div>
      {error ? <p className="text-destructive mt-1.5 text-xs leading-4">{error}</p> : null}
    </div>
  )
}
