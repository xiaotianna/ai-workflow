import { Slider } from '@ai-workflow/ui/components/slider'
import type { FieldRendererProps } from '../registry'

export const SliderField = ({ field, onChange }: FieldRendererProps) => {
  return (
    <div className="space-y-1">
      <div className="text-sm font-medium">{field.label}</div>
      <Slider defaultValue={[33]} max={100} step={1} onChange={onChange} />
      {field.description && (
        <div className="text-muted-foreground text-xs">{field.description}</div>
      )}
    </div>
  )
}
