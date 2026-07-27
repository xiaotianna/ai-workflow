import type { FieldValue, SelectFieldSchema } from '@ai-workflow/core'
import { Form } from '@ai-workflow/ui/components/form'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@ai-workflow/ui/components/select'
import type { FieldRendererProps } from '../../contracts/field-renderer'

export function SelectField({
  name,
  field,
  value,
  error,
  disabled,
  onChange,
}: FieldRendererProps<SelectFieldSchema, FieldValue>) {
  const selectedIndex = field.options.findIndex((option) => Object.is(option.value, value))

  return (
    <Form.Field
      label={field.label}
      description={field.description}
      error={error}
      required={field.required}
    >
      <Select
        name={name}
        value={selectedIndex !== -1 ? String(selectedIndex) : undefined}
        disabled={disabled}
        required={field.required}
        onValueChange={(nextIndex) => {
          const option = field.options[Number(nextIndex)]
          onChange(option?.value)
        }}
      >
        <SelectTrigger className="w-full" aria-label={field.label} aria-invalid={Boolean(error)}>
          <SelectValue placeholder={`请选择${field.label}`} />
        </SelectTrigger>
        <SelectContent>
          {field.options.map((option, index) => (
            <SelectItem
              key={`${typeof option.value}:${String(option.value)}:${index}`}
              value={String(index)}
            >
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </Form.Field>
  )
}
