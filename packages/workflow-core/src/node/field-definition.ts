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

// 特殊的schema类型字段定义
export interface SchemaFieldDefinition extends BaseFieldDefinition {
  kind: 'schema'
  // schema definition 注册的 key
  schemaFieldType: string
  ui: WorkflowFieldUIType.SCHEMA_EDITOR
}

/**
 * 使用示例：
1、 form: {
      variables: {
        kind: 'schema',
        schemaFieldType: BuiltinCustomTypeName.WORKFLOW_VARIABLE_DEFINITION,
        label: 'Variables',
        ui: WorkflowFieldUIType.SCHEMA_EDITOR,
        default: [],
        description: '在工作流开始时声明输入变量，变量可以在后续节点中使用'
      }
    }
2、 form: {
      prompt: {
        type: 'string',
        label: 'Prompt',
        required: true,
        ui: WorkflowFieldUIType.INPUT,
        description: '发送给模型的用户提示词',
      },
    }
 */
export type NodeFieldDefinition =
  | StringFieldDefinition
  | NumberFieldDefinition
  | BooleanFieldDefinition
  | SelectFieldDefinition
  | SchemaFieldDefinition
