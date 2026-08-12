import type { NumberFieldSchema } from '@ai-workflow/core'
import { Form } from '@ai-workflow/ui/components/form'
import { Input } from '@ai-workflow/ui/components/input'
import type { FieldRendererProps } from '../../contracts/field-renderer'

export function NumberField({
  name,
  field,
  value,
  error,
  disabled,
  onChange,
}: FieldRendererProps<NumberFieldSchema, number>) {
  return (
    <Form.Field
      label={field.label}
      description={field.description}
      error={error}
      required={field.required}
    >
      <Input
        name={name}
        type="number"
        value={typeof value === 'number' && Number.isFinite(value) ? value : ''}
        required={field.required}
        disabled={disabled}
        aria-label={field.label}
        aria-invalid={Boolean(error)}
        onChange={(event) => {
          const rawValue = event.currentTarget.value,
            numberValue = event.currentTarget.valueAsNumber

          onChange(rawValue === '' || Number.isNaN(numberValue) ? undefined : numberValue)
        }}
      />
    </Form.Field>
  )
}
