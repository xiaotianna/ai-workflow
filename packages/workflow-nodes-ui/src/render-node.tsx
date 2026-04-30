import { BaseNode } from './nodes/base'
import type { NodeContentProps } from './nodes/base'
import { getUINode } from './registry'

export function RenderNode(props: NodeContentProps) {
  const RenderNodeComponent = getUINode(props.type)

  return (
    <BaseNode
      definition={props.definition}
      selected={props.selected}
      disabled={props.disabled}
      onSelect={props.onSelect}
      onDelete={props.onDelete}
    >
      <RenderNodeComponent {...props} />
    </BaseNode>
  )
}
