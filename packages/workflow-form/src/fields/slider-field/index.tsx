import type { SliderFieldSchema } from '@ai-workflow/core'
import { Form } from '@ai-workflow/ui/components/form'
import { Input } from '@ai-workflow/ui/components/input'
import { Slider } from '@ai-workflow/ui/components/slider'
import type { FieldRendererProps } from '../../contracts/field-renderer'

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

export function SliderField({
  name,
  field,
  value,
  error,
  disabled,
  onChange,
}: FieldRendererProps<SliderFieldSchema, number>) {
  const min = field.min ?? 0
  const max = field.max ?? 100
  const numericValue = typeof value === 'number' && Number.isFinite(value) ? value : undefined
  const sliderValue = clamp(numericValue ?? min, min, max)

  return (
    <Form.Field
      label={field.label}
      description={field.description}
      error={error}
      required={field.required}
    >
      <div className="flex items-center gap-3">
        <Slider
          value={[sliderValue]}
          min={min}
          max={max}
          step={field.step}
          disabled={disabled}
          aria-label={field.label}
          aria-invalid={Boolean(error)}
          className="min-w-0 flex-1"
          onValueChange={(nextValue) => onChange(nextValue[0] ?? sliderValue)}
        />
        <Input
          name={name}
          type="number"
          value={numericValue ?? ''}
          min={min}
          max={max}
          step={field.step}
          required={field.required}
          disabled={disabled}
          aria-label={`${field.label}数值`}
          aria-invalid={Boolean(error)}
          className="w-20 shrink-0"
          onChange={(event) => {
            const rawValue = event.currentTarget.value
            const numberValue = event.currentTarget.valueAsNumber

            onChange(rawValue === '' || Number.isNaN(numberValue) ? undefined : numberValue)
          }}
        />
      </div>
    </Form.Field>
  )
}
