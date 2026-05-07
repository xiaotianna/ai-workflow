import { WorkflowDataTypeKind } from '../node/enums'

// 原始类型定义
export interface PrimitiveTypeDefinition {
  kind:
    | WorkflowDataTypeKind.STRING
    | WorkflowDataTypeKind.NUMBER
    | WorkflowDataTypeKind.BOOLEAN
    | WorkflowDataTypeKind.JSON
    | WorkflowDataTypeKind.CHAT_MESSAGE
    | WorkflowDataTypeKind.IMAGE
}

// 数组类型定义
export interface ArrayTypeDefinition {
  kind: WorkflowDataTypeKind.ARRAY
  itemType: WorkflowDataType
}

// 对象类型定义
export interface ObjectTypeDefinition {
  kind: WorkflowDataTypeKind.OBJECT
  properties?: Record<string, WorkflowDataType>
}

// 自定义类型定义
export interface CustomTypeDefinition {
  kind: WorkflowDataTypeKind.CUSTOM
  typeName: string
}

// 工作流数据类型
/**
 * 使用示例：
 *  dataType: {
      kind: 'array',
      itemType: {
        kind: 'custom',
        typeName: 'workflow-variable'
      }
    }
 */
export type WorkflowDataType =
  | PrimitiveTypeDefinition
  | ArrayTypeDefinition
  | ObjectTypeDefinition
  | CustomTypeDefinition
