import { Input } from '@ai-workflow/ui/components/input'
import type { FieldRendererProps } from '../registry'

export const InputField = ({ field, value, onChange }: FieldRendererProps) => {
  return (
    <div className="space-y-1">
      <div className="text-sm font-medium">{field.label}</div>
      <Input
        value={typeof value === 'string' ? value : ''}
        onChange={(event) => onChange(event.target.value)}
      />
      {field.description && (
        <div className="text-muted-foreground text-xs">{field.description}</div>
      )}
    </div>
  )
}
