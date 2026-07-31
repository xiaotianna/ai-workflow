import type { FieldSchema } from '@ai-workflow/core'
import type { ComponentType } from 'react'

import type { AvailableVariableOption } from './available-variable-option'

export type FieldRendererErrors = Readonly<Record<string, string | undefined>>

export interface FieldRendererProps<TField extends FieldSchema = FieldSchema, TValue = unknown> {
  name: string
  field: TField
  value: TValue | undefined
  error?: string
  errors?: FieldRendererErrors
  availableVariables?: readonly AvailableVariableOption[]
  disabled?: boolean
  onChange: (value: TValue | undefined) => void
}

export type FieldRenderer<
  TField extends FieldSchema = FieldSchema,
  TValue = unknown,
> = ComponentType<FieldRendererProps<TField, TValue>>

export type AnyFieldRenderer = FieldRenderer<any, any>
