import type { SliderFieldSchema } from '@ai-workflow/core'
import { Form } from '@ai-workflow/ui/components/form'
import { Slider } from '@ai-workflow/ui/components/slider'
import type { FieldRendererProps } from '../../contracts/field-renderer'

export function SliderField({
  name,
  field,
  value,
  error,
  disabled,
  onChange,
}: FieldRendererProps<SliderFieldSchema, number>) {
  const sliderValue = typeof value === 'number' && Number.isFinite(value) ? value : (field.min ?? 0)

  return (
    <Form.Field
      label={field.label}
      description={field.description}
      error={error}
      required={field.required}
    >
      <div className="flex items-center gap-3">
        <Slider
          name={name}
          value={[sliderValue]}
          min={field.min}
          max={field.max}
          step={field.step}
          disabled={disabled}
          aria-label={field.label}
          aria-invalid={Boolean(error)}
          onValueChange={(nextValue) => onChange(nextValue[0])}
        />
        <output className="text-muted-foreground min-w-10 text-right text-sm">{sliderValue}</output>
      </div>
    </Form.Field>
  )
}
