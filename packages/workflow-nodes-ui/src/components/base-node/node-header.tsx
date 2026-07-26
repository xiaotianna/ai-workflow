import type { NodeDefinition } from '@ai-workflow/core'
import { cn } from '@ai-workflow/ui/lib/utils'
import type { ReactNode } from 'react'

import { getNodeThemeColor } from '../../common/node-theme-map'
import { NodeIcon } from '../node-icon'

export interface NodeHeaderProps {
  definition: NodeDefinition
  actions?: ReactNode
  onDelete?: () => void
  className?: string
}

// 统一渲染节点头部，完整节点渲染器可以通过className适配自身布局
export function NodeHeader({ definition, actions, onDelete, className }: NodeHeaderProps) {
  return (
    <header className={cn('flex items-center justify-between p-3', className)}>
      <div className="flex min-w-0 items-center">
        <span
          className="text-primary-foreground mr-2 flex size-6 shrink-0 items-center justify-center rounded-[0.5rem] shadow-md"
          style={{ backgroundColor: getNodeThemeColor(definition.type) }}
        >
          <NodeIcon icon={definition.icon} className="size-4" aria-hidden />
        </span>

        <div className="min-w-0">
          <div className="text-foreground truncate text-sm font-semibold">{definition.label}</div>
        </div>
      </div>

      {actions || onDelete ? (
        <div className="ml-3 flex shrink-0 items-center gap-2">
          {actions}
          {onDelete ? (
            <button
              type="button"
              aria-label={`删除${definition.label}节点`}
              onClick={(event) => {
                event.stopPropagation()
                onDelete()
              }}
              className="text-muted-foreground hover:text-destructive cursor-pointer text-xs transition-colors"
            >
              删除
            </button>
          ) : null}
        </div>
      ) : null}
    </header>
  )
}
