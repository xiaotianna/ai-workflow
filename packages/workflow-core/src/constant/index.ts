import { WorkflowDataTypeKind } from '../node'

export const BuiltinCustomTypeName = {
  WORKFLOW_VARIABLE_DEFINITION: 'workflow-variable-definition',
}

// 支持的数据类型选项
export const DATA_TYPE_OPTIONS = [
  WorkflowDataTypeKind.STRING,
  WorkflowDataTypeKind.NUMBER,
  WorkflowDataTypeKind.BOOLEAN,
  WorkflowDataTypeKind.JSON,
  WorkflowDataTypeKind.CHAT_MESSAGE,
  WorkflowDataTypeKind.IMAGE,
] as const

// 变量字段类型枚举
export type VariableFieldType = (typeof DATA_TYPE_OPTIONS)[number]
