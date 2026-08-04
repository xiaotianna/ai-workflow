import type { NodeDefinition } from '@ai-workflow/core'
import type { NodeContentProps } from '../contracts/node-content'
import { NodeContentList } from './base-node'

export function hasDefaultNodeContent(definition: NodeDefinition) {
  return Boolean(definition.description?.trim())
}

export const DefaultNodeContent = ({ definition }: NodeContentProps) => {
  if (!hasDefaultNodeContent(definition)) {
    return null
  }

  return (
    <NodeContentList>
      <div className="text-muted-foreground text-xs leading-4 font-normal">
        {definition.description}
      </div>
    </NodeContentList>
  )
}
