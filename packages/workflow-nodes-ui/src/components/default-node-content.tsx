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
      <div className="text-slate-500">{definition.description}</div>
    </NodeContentList>
  )
}
