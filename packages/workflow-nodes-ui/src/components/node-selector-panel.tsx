import type { NodeType } from '@ai-workflow/core'
import { Input } from '@ai-workflow/ui/components/input'
import { Tabs, TabsContent } from '@ai-workflow/ui/components/tabs'
import { cn } from '@ai-workflow/ui/lib/utils'
import { Search } from 'lucide-react'
import { useMemo, useState } from 'react'

import { NodeSelectorArchTabsList, NodeSelectorArchTabTrigger } from './node-selector-arch-tabs'
import { NodeSelectorBuiltinPanel } from './node-selector-builtin-panel'
import { NodeSelectorPluginPanel } from './node-selector-plugin-panel'
import {
  filterNodeTypesByQuery,
  splitNodeTypesByOrigin,
  type NodeSelectorTab,
} from './node-selector-utils'

export type { NodeSelectorTab } from './node-selector-utils'

interface NodeSelectorPanelProps {
  nodeTypes: readonly NodeType[]
  disabledNodeTypes?: ReadonlySet<string>
  pluginGroupLabelByNodeType?: ReadonlyMap<string, string>
  activeTab?: NodeSelectorTab
  defaultActiveTab?: NodeSelectorTab
  onActiveTabChange?: (tab: NodeSelectorTab) => void
  className?: string
  onSelectNode: (type: string) => void
}

export function NodeSelectorPanel({
  nodeTypes,
  disabledNodeTypes,
  pluginGroupLabelByNodeType,
  activeTab: controlledActiveTab,
  defaultActiveTab = 'builtin',
  onActiveTabChange,
  className,
  onSelectNode,
}: NodeSelectorPanelProps) {
  const [query, setQuery] = useState(''),
    [uncontrolledActiveTab, setUncontrolledActiveTab] = useState<NodeSelectorTab>(defaultActiveTab),
    requestedActiveTab = controlledActiveTab ?? uncontrolledActiveTab,
    { builtinNodeTypes, pluginNodeTypes } = useMemo(
      () => splitNodeTypesByOrigin(nodeTypes),
      [nodeTypes],
    ),
    filteredBuiltinNodeTypes = useMemo(
      () => filterNodeTypesByQuery(builtinNodeTypes, query),
      [builtinNodeTypes, query],
    ),
    filteredPluginNodeTypes = useMemo(
      () => filterNodeTypesByQuery(pluginNodeTypes, query),
      [pluginNodeTypes, query],
    ),
    hasPluginNodes = pluginNodeTypes.length > 0,
    activeTab = requestedActiveTab === 'plugin' && hasPluginNodes ? 'plugin' : 'builtin'

  function handleActiveTabChange(nextTab: string) {
    if (nextTab !== 'builtin' && nextTab !== 'plugin') return

    if (controlledActiveTab === undefined) {
      setUncontrolledActiveTab(nextTab)
    }
    onActiveTabChange?.(nextTab)
  }

  return (
    <div className={cn('w-[min(21rem,calc(100vw-2rem))] overflow-hidden', className)}>
      <Tabs value={activeTab} onValueChange={handleActiveTabChange} className="min-w-0">
        {hasPluginNodes ? (
          <NodeSelectorArchTabsList aria-label="节点选择来源">
            <NodeSelectorArchTabTrigger value="builtin">内置节点</NodeSelectorArchTabTrigger>
            <NodeSelectorArchTabTrigger value="plugin">插件</NodeSelectorArchTabTrigger>
          </NodeSelectorArchTabsList>
        ) : null}

        <div className="p-2">
          <div className="relative">
            <Search
              className="text-input-placeholder pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2"
              aria-hidden
            />
            <Input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="搜索节点名称、描述或类型"
              aria-label="搜索节点"
              className="h-8 pr-8 pl-8"
            />
          </div>

          <TabsContent value="builtin" className="mt-2 outline-none">
            <NodeSelectorBuiltinPanel
              nodeTypes={filteredBuiltinNodeTypes}
              disabledNodeTypes={disabledNodeTypes}
              onSelectNode={onSelectNode}
            />
          </TabsContent>

          {hasPluginNodes ? (
            <TabsContent value="plugin" className="mt-2 outline-none">
              <NodeSelectorPluginPanel
                nodeTypes={filteredPluginNodeTypes}
                disabledNodeTypes={disabledNodeTypes}
                pluginGroupLabelByNodeType={pluginGroupLabelByNodeType}
                onSelectNode={onSelectNode}
              />
            </TabsContent>
          ) : null}
        </div>
      </Tabs>
    </div>
  )
}
