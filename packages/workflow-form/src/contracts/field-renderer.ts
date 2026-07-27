import type { FieldSchema } from '@ai-workflow/core'

export interface FieldRendererProps<TField extends FieldSchema = FieldSchema> {
  name: string
  field: TField
  value: unknown
  error?: string
  disabled?: boolean
  onChange: (value: unknown) => void
}
