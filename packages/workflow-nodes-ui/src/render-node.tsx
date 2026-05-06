import { BaseNode } from './nodes/base'
import type { NodeContentProps } from './nodes/base'
import { getUINode } from './registry'

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
