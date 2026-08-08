import type { NodeType } from '@ai-workflow/core'
import { cn } from '@ai-workflow/ui/lib/utils'

import { NodeSelectorNodeItem } from './node-selector-node-item'
import { groupPluginNodeTypes, NODE_SELECTOR_LIST_MIN_HEIGHT_CLASS } from './node-selector-utils'

interface NodeSelectorPluginPanelProps {
  nodeTypes: readonly NodeType[]
  disabledNodeTypes?: ReadonlySet<string>
  pluginGroupLabelByNodeType?: ReadonlyMap<string, string>
  className?: string
  onSelectNode: (type: string) => void
}

export function NodeSelectorPluginPanel({
  nodeTypes,
  disabledNodeTypes,
  pluginGroupLabelByNodeType,
  className,
  onSelectNode,
}: NodeSelectorPluginPanelProps) {
  const groups = groupPluginNodeTypes(nodeTypes, pluginGroupLabelByNodeType)

  if (groups.length === 0) {
    return (
      <div
        role="status"
        className={cn(
          'text-muted-foreground flex items-center justify-center px-4 text-center text-sm',
          NODE_SELECTOR_LIST_MIN_HEIGHT_CLASS,
        )}
      >
        没有找到匹配的插件节点
      </div>
    )
  }

  return (
    <div
      aria-label="可选择插件节点"
      className={cn(
        'max-h-96 space-y-3 overflow-y-auto overscroll-contain',
        NODE_SELECTOR_LIST_MIN_HEIGHT_CLASS,
        className,
      )}
    >
      {groups.map((group) => (
        <section key={group.label} aria-label={group.label}>
          <h3 className="text-muted-foreground px-2 text-xs leading-4 font-medium">
            {group.label}
          </h3>
          <ul className="mt-1 grid grid-cols-1 gap-1 sm:grid-cols-2">
            {group.nodeTypes.map((nodeType) => (
              <NodeSelectorNodeItem
                key={nodeType.definition.type}
                nodeType={nodeType}
                disabled={disabledNodeTypes?.has(nodeType.definition.type) ?? false}
                onSelectNode={onSelectNode}
              />
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}
