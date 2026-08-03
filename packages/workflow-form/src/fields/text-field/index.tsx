import type { TextFieldSchema } from '@ai-workflow/core'
import { Form } from '@ai-workflow/ui/components/form'
import { Input } from '@ai-workflow/ui/components/input'
import type { FieldRendererProps } from '../../contracts/field-renderer'

export function TextField({
  name,
  field,
  value,
  error,
  disabled,
  onChange,
}: FieldRendererProps<TextFieldSchema, string>) {
  return (
    <Form.Field label={field.label} error={error} required={field.required}>
      <Input
        name={name}
        type="text"
        value={value ?? ''}
        required={field.required}
        placeholder={field.description}
        disabled={disabled}
        aria-label={field.label}
        aria-invalid={Boolean(error)}
        onChange={(event) => onChange(event.currentTarget.value)}
      />
    </Form.Field>
  )
}
