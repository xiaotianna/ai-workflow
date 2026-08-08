import type { NodeType } from '@ai-workflow/core'
import { cn } from '@ai-workflow/ui/lib/utils'

import { NodeSelectorNodeItem } from './node-selector-node-item'
import { NODE_SELECTOR_LIST_MIN_HEIGHT_CLASS } from './node-selector-utils'

interface NodeSelectorBuiltinPanelProps {
  nodeTypes: readonly NodeType[]
  disabledNodeTypes?: ReadonlySet<string>
  className?: string
  onSelectNode: (type: string) => void
}

export function NodeSelectorBuiltinPanel({
  nodeTypes,
  disabledNodeTypes,
  className,
  onSelectNode,
}: NodeSelectorBuiltinPanelProps) {
  if (nodeTypes.length === 0) {
    return (
      <div
        role="status"
        className={cn(
          'text-muted-foreground flex items-center justify-center px-4 text-center text-sm',
          NODE_SELECTOR_LIST_MIN_HEIGHT_CLASS,
        )}
      >
        没有找到匹配的内置节点
      </div>
    )
  }

  return (
    <ul
      aria-label="可选择内置节点"
      className={cn(
        'grid max-h-80 grid-cols-1 gap-1 overflow-y-auto overscroll-contain sm:grid-cols-2',
        NODE_SELECTOR_LIST_MIN_HEIGHT_CLASS,
        className,
      )}
    >
      {nodeTypes.map((nodeType) => (
        <NodeSelectorNodeItem
          key={nodeType.definition.type}
          nodeType={nodeType}
          disabled={disabledNodeTypes?.has(nodeType.definition.type) ?? false}
          onSelectNode={onSelectNode}
        />
      ))}
    </ul>
  )
}
