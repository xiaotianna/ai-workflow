import type { SwitchFieldSchema } from '@ai-workflow/core'
import { Form } from '@ai-workflow/ui/components/form'
import { Switch } from '@ai-workflow/ui/components/switch'
import type { FieldRendererProps } from '../../contracts/field-renderer'

export function SwitchField({
  name,
  field,
  value,
  error,
  disabled,
  onChange,
}: FieldRendererProps<SwitchFieldSchema, boolean>) {
  return (
    <Form.Field
      label={field.label}
      description={field.description}
      error={error}
      required={field.required}
    >
      <Switch
        name={name}
        checked={value ?? false}
        required={field.required}
        disabled={disabled}
        aria-label={field.label}
        aria-invalid={Boolean(error)}
        onCheckedChange={onChange}
      />
    </Form.Field>
  )
}
