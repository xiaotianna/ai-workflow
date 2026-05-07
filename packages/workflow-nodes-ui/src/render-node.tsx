import { BaseNode } from './nodes/base'
import type { NodeContentProps } from './nodes/base'
import { getUINode } from './registry'

// 在apps/web中使用，props由外部传递（该nodes-ui包只是作为节点的渲染）
export function RenderNode(props: NodeContentProps) {
  const { definition, selected, disabled, onSelect, onDelete, type } = props
  const RenderNodeComponent = getUINode(type)

  return (
    <BaseNode
      definition={definition}
      selected={selected}
      disabled={disabled}
      onSelect={onSelect}
      onDelete={onDelete}
    >
      <RenderNodeComponent {...props} />
    </BaseNode>
  )
}
