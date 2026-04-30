export interface BaseNodeDefinition {
  type: string
  label: string
  description?: string
}

export interface BaseNodeUIProps<T = unknown, D extends BaseNodeDefinition = BaseNodeDefinition> {
  id: string // id
  type: string // node类型
  definition: D // node定义信息

  data: T // 具体节点的数据

  selected?: boolean // 是否被选中
  disabled?: boolean // 是否禁用

  onChange: (data: T) => void // data变化回调
  onSelect?: () => void // 选中回调
  onDelete?: () => void // 删除回调
}

export interface NodeContentProps<
  T = unknown,
  D extends BaseNodeDefinition = BaseNodeDefinition,
> extends BaseNodeUIProps<T, D> {}
