import type { NodeType } from '@ai-workflow/core'
import { Input } from '@ai-workflow/ui/components/input'
import { cn } from '@ai-workflow/ui/lib/utils'
import { Search } from 'lucide-react'
import { useState } from 'react'

import { getNodeThemeColor } from '../common/node-theme-map'
import { NodeIcon } from './node-icon'

interface NodeSelectorPanelProps {
  nodeTypes: readonly NodeType[]
  disabledNodeTypes?: ReadonlySet<string>
  className?: string
  onSelectNode: (type: string) => void
}

export function NodeSelectorPanel({
  nodeTypes,
  disabledNodeTypes,
  className,
  onSelectNode,
}: NodeSelectorPanelProps) {
  const [query, setQuery] = useState('')
  const normalizedQuery = query.trim().toLocaleLowerCase()
  const filteredNodeTypes = nodeTypes.filter(({ definition }) =>
    [definition.label, definition.description, definition.type].some((value) =>
      value?.toLocaleLowerCase().includes(normalizedQuery),
    ),
  )

  return (
    <div className={cn('w-[min(21rem,calc(100vw-2rem))] p-2', className)}>
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

      <ul
        aria-label="可选择节点"
        className="mt-2 grid max-h-80 grid-cols-1 gap-1 overflow-y-auto overscroll-contain sm:grid-cols-2"
      >
        {filteredNodeTypes.map(({ definition }) => {
          const disabled = disabledNodeTypes?.has(definition.type) ?? false

          return (
            <li key={definition.type}>
              <button
                type="button"
                disabled={disabled}
                className="enabled:hover:bg-accent enabled:focus-visible:bg-accent flex w-full items-center gap-2 rounded-md px-2 py-1 text-left outline-hidden transition-colors enabled:cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
                onClick={() => onSelectNode(definition.type)}
              >
                <span
                  className="text-primary-foreground flex size-6 shrink-0 items-center justify-center rounded-md"
                  style={{ backgroundColor: getNodeThemeColor(definition.type) }}
                >
                  <NodeIcon icon={definition.icon} className="size-4" aria-hidden />
                </span>
                <span className="min-w-0 truncate text-sm font-medium">{definition.label}</span>
              </button>
            </li>
          )
        })}
      </ul>

      {filteredNodeTypes.length === 0 ? (
        <div
          role="status"
          className="text-muted-foreground flex min-h-20 items-center justify-center px-4 text-center text-sm"
        >
          没有找到匹配的节点
        </div>
      ) : null}
    </div>
  )
}
