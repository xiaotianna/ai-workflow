import type { NodeDefinition } from '@ai-workflow/core'
import type { NodeContentProps } from '../contracts/node-content'

export function hasDefaultNodeContent(definition: NodeDefinition) {
  return Boolean(definition.description?.trim())
}

export const DefaultNodeContent = ({ definition }: NodeContentProps) => {
  if (!hasDefaultNodeContent(definition)) {
    return null
  }

  return (
    <div className="space-y-2 text-xs">
      <div className="text-slate-500">{definition.description}</div>
    </div>
  )
}
