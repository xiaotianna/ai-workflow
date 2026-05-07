export interface ReferenceInputValue {
  mode: 'reference'
  nodeId: string
  output: string
}

export interface StaticInputValue {
  mode: 'static'
  value: unknown
}

// 输入接收的类型（静态值或引用上游节点的值）
export type InputValue = StaticInputValue | ReferenceInputValue
