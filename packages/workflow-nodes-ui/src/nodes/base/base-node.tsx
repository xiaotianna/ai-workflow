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
  return (
    <div
      onClick={onSelect}
      className={[
        'w-[320px] rounded-xl border bg-white shadow-sm',
        selected ? 'ring-2 ring-blue-500' : '',
        disabled ? 'pointer-events-none opacity-50' : '',
      ].join(' ')}
    >
      {/* Header */}
      <div className="flex items-start justify-between border-b p-3">
        <div>
          <h3 className="text-sm font-semibold">{definition.label}</h3>
          {definition.description && (
            <p className="mt-1 text-xs text-gray-500">{definition.description}</p>
          )}
        </div>

        <div className="flex items-center gap-2">
          {onDelete && (
            <button onClick={onDelete} className="text-xs text-red-500 hover:underline">
              删除
            </button>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="p-3">{cloneElement(children, definition)}</div>
    </div>
  )
}
