import { WorkflowFieldUIType } from './enums'

// 基础字段（后续会继承）
export interface BaseFieldDefinition {
  label: string
  description?: string
  required?: boolean
  default?: unknown
  props?: unknown
}

// 扩展类型
// 可以扩展node节点的form字段
// TODO：改为枚举
export interface StringFieldDefinition extends BaseFieldDefinition {
  type: 'string'
  ui?: WorkflowFieldUIType.INPUT | WorkflowFieldUIType.TEXTAREA
}

export interface NumberFieldDefinition extends BaseFieldDefinition {
  type: 'number'
  ui?: WorkflowFieldUIType.INPUT | WorkflowFieldUIType.SLIDER
  min?: number
  max?: number
  step?: number
}

export interface BooleanFieldDefinition extends BaseFieldDefinition {
  type: 'boolean'
  ui?: WorkflowFieldUIType.SWITCH
}

export interface SelectFieldDefinition extends BaseFieldDefinition {
  type: 'select'
  ui: WorkflowFieldUIType.SELECT
  options: Array<{
    label: string
    value: string | number | boolean
  }>
}

export type NodeFieldDefinition =
  | StringFieldDefinition
  | NumberFieldDefinition
  | BooleanFieldDefinition
  | SelectFieldDefinition
