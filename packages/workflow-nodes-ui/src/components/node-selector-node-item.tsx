import type { NodeType } from '@ai-workflow/core'

import { NodeIconBadge } from './node-icon-badge'

interface NodeSelectorNodeItemProps {
  nodeType: NodeType
  disabled?: boolean
  onSelectNode: (type: string) => void
}

export function NodeSelectorNodeItem({
  nodeType,
  disabled = false,
  onSelectNode,
}: NodeSelectorNodeItemProps) {
  const { definition } = nodeType

  return (
    <li>
      <button
        type="button"
        disabled={disabled}
        className="enabled:hover:bg-accent enabled:focus-visible:bg-accent flex w-full items-center gap-2 rounded-md px-2 py-1 text-left outline-hidden transition-colors enabled:cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
        onClick={() => onSelectNode(definition.type)}
      >
        <NodeIconBadge type={definition.type} icon={definition.icon} className="rounded-md" />
        <span className="min-w-0 truncate text-sm font-medium">{definition.label}</span>
      </button>
    </li>
  )
}
