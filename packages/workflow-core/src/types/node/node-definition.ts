import { z } from 'zod'
import { WorkflowFieldUIType } from './enums'

export type FieldType = 'string' | 'number' | 'boolean' | 'select'

export interface NodeFieldDefinition {
  type: FieldType
  label: string
  description?: string
  required?: boolean
  default?: unknown
  ui?: WorkflowFieldUIType // 表单字段使用的ui组件
  props?: unknown // 使用ui组件的props
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
