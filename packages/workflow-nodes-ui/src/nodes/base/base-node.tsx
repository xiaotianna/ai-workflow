import { cloneElement } from 'react'
import type { ReactElement } from 'react'
import type { BaseNodeDefinition } from './type'

export interface BaseNodeProps {
  definition: BaseNodeDefinition

  selected?: boolean
  disabled?: boolean

  onSelect?: () => void
  onDelete?: () => void

  children: ReactElement
}

export function BaseNode({
  definition,
  selected,
  disabled,
  onSelect,
  onDelete,
  children,
}: BaseNodeProps) {
  const NodeIcon = definition.icon
  return (
    <div
      onClick={onSelect}
      className={[
        'group relative w-60 rounded-2xl bg-transparent transition-all',
        'hover:shadow-lg hover:shadow-black/5',
        selected ? 'shadow-lg ring-2 shadow-blue-100 ring-blue-500' : '',
        disabled ? 'pointer-events-none opacity-50' : '',
      ].join(' ')}
    >
      <div className="overflow-hidden rounded-[15px] border border-black/5 bg-white">
        {/* Header */}
        <div className="flex items-start justify-between px-4 pt-3 pb-3">
          <div className="flex min-w-0 items-center">
            <div className="mr-2 flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] bg-blue-600 text-white">
              <NodeIcon className="h-4 w-4" />
            </div>
            <div className="min-w-0 truncate text-sm font-semibold text-gray-900">
              {definition.label}
            </div>
          </div>

          <div className="ml-3 flex items-center gap-2">
            {onDelete && (
              <button
                onClick={onDelete}
                className="text-xs text-gray-400 transition-colors hover:text-red-500"
              >
                删除
              </button>
            )}
          </div>
        </div>

        {/* Body */}
        <div className="px-4 pt-3 pb-4">{cloneElement(children, definition)}</div>
      </div>
    </div>
  )
}
