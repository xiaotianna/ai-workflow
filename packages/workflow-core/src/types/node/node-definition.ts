import { z } from 'zod'

export type FieldType = 'string' | 'number' | 'boolean' | 'select'

export type FieldUI = 'input' | 'textarea' | 'slider' | 'switch' | 'select'

export interface NodeFieldDefinition {
  type: FieldType
  label: string
  description?: string
  required?: boolean
  default?: unknown
  ui?: FieldUI
  options?: Array<{
    label: string
    value: string | number | boolean
  }>
}

export interface NodeDefinition<TSchema extends z.ZodTypeAny = z.ZodTypeAny> {
  type: string
  label: string
  description?: string
  icon?: string

  inputs: Record<string, NodeFieldDefinition>
  outputs?: Record<string, NodeFieldDefinition>

  schema: TSchema
}
