import type { KeyboardEvent, ReactNode } from 'react'
import { NodeIcon } from '../node-icon'
import type { NodeDefinition } from '@ai-workflow/core'
import type { NodePortRender } from '../../contracts/node-content'
import { cn } from '@ai-workflow/ui/lib/utils'
import { getNodeThemeColor } from '../../common/node-theme-map'
import { NodePortsRender } from './node-ports-render'

export interface BaseNodeProps {
  nodeId: string
  definition: NodeDefinition
  ports: NodeDefinition['ports']
  selected?: boolean
  disabled?: boolean
  onSelect?: () => void
  onDelete?: () => void
  // 渲染端口
  renderPort?: NodePortRender
  // 各节点组件ui
  children: ReactNode
}

export function BaseNode({
  nodeId,
  definition,
  ports,
  selected = false,
  disabled = false,
  onSelect,
  onDelete,
  renderPort,
  children,
}: BaseNodeProps) {
  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!onSelect || disabled) {
      return
    }

    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      onSelect()
    }
  }

  return (
    <div
      // 是否tab键聚集
      tabIndex={onSelect && !disabled ? 0 : undefined}
      onClick={disabled ? undefined : onSelect}
      onKeyDown={handleKeyDown}
      className={cn(
        'group relative w-60 rounded-2xl bg-transparent transition-shadow',
        'hover:shadow-lg hover:shadow-black/5',
        selected && 'shadow-primary/10 shadow-lg',
        disabled && 'pointer-events-none opacity-50',
      )}
    >
      <div
        className={cn(
          'bg-card border-border/30 overflow-hidden rounded-[15px] border shadow-xs transition-[border-color,background-color]',
          selected && 'border-primary border-[1.5px]',
        )}
      >
        {/* Header */}
        <div className="flex items-start justify-between px-4 pt-3 pb-3">
          <div className="flex min-w-0 items-center">
            <div
              className="text-primary-foreground mr-2 flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px]"
              style={{ backgroundColor: getNodeThemeColor(definition.type) }}
            >
              <NodeIcon icon={definition.icon} className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold text-gray-900">{definition.label}</div>

              {definition.description && (
                <div className="truncate text-xs text-gray-500">{definition.description}</div>
              )}
            </div>
          </div>

          {onDelete && (
            <button
              type="button"
              aria-label={`删除${definition.label}节点`}
              onClick={(event) => {
                event.stopPropagation()
                onDelete()
              }}
              className="ml-3 text-xs text-gray-400 transition-colors hover:text-red-500"
            >
              删除
            </button>
          )}
        </div>

        {/* Body */}
        <div className="px-4 pt-3 pb-4">{children}</div>
      </div>

      {/* 输入端口样式 */}
      <NodePortsRender
        nodeId={nodeId}
        direction="input"
        ports={ports.inputs}
        renderPort={renderPort}
      />
      {/* 输出端口样式 */}
      <NodePortsRender
        nodeId={nodeId}
        direction="output"
        ports={ports.outputs}
        renderPort={renderPort}
      />
    </div>
  )
}
