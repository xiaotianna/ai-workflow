export interface ReferenceValue {
  mode: 'reference'
  nodeId: string
  output: string
}

export interface StaticValue {
  mode: 'static'
  value: any
}

// 输入的类型（静态值或引用上游节点的值）
export type InputValue = StaticValue | ReferenceValue

// 工作流数据类型
export type WorkflowDataType =
  | 'string'
  | 'number'
  | 'boolean'
  | 'json'
  | 'array'
  | 'object'
  | 'chat-message'
  | 'image'

export interface WorkflowNode {
  id: string

  type: string

  position?: {
    x: number
    y: number
  }

  data: Record<string, InputValue>
}
