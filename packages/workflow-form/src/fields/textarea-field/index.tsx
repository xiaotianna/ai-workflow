import type { TextareaFieldSchema } from '@ai-workflow/core'
import { Form } from '@ai-workflow/ui/components/form'
import { Textarea } from '@ai-workflow/ui/components/textarea'
import type { FieldRendererProps } from '../../contracts/field-renderer'

export function TextareaField({
  name,
  field,
  value,
  error,
  disabled,
  onChange,
}: FieldRendererProps<TextareaFieldSchema, string>) {
  return (
    <Form.Field
      label={field.label}
      description={field.description}
      error={error}
      required={field.required}
    >
      <Textarea
        name={name}
        value={value ?? ''}
        required={field.required}
        disabled={disabled}
        aria-label={field.label}
        aria-invalid={Boolean(error)}
        onChange={(event) => onChange(event.currentTarget.value)}
      />
    </Form.Field>
  )
}
