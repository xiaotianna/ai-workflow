import { cn } from '@ai-workflow/ui/lib/utils'
import type { KeyboardEvent, ReactNode } from 'react'
import type { NodeExecutionStatus } from '../../contracts/node-content'

export interface NodeWrapperProps {
  children: ReactNode
  selected?: boolean
  disabled?: boolean
  onSelect?: () => void
  ariaLabel?: string
  wrapperClassName?: string
  className?: string
  executionStatus?: NodeExecutionStatus
}

// 统一处理普通节点和完整节点渲染器的外层、卡片样式、选择、禁用与键盘交互
export function NodeWrapper({
  children,
  selected = false,
  disabled = false,
  onSelect,
  ariaLabel,
  wrapperClassName,
  className,
  executionStatus,
}: NodeWrapperProps) {
  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.target !== event.currentTarget || !onSelect || disabled) {
      return
    }

    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      onSelect()
    }
  }

  return (
    <div
      aria-label={ariaLabel}
      data-selected={selected}
      // 是否tab键聚集
      tabIndex={onSelect && !disabled ? 0 : undefined}
      onClick={disabled ? undefined : onSelect}
      onKeyDown={handleKeyDown}
      className={cn(
        'group relative rounded-2xl bg-transparent transition-shadow',
        'hover:shadow-lg hover:shadow-black/5',
        selected && 'shadow-primary/10 shadow-lg',
        disabled && 'pointer-events-none opacity-50',
        wrapperClassName,
      )}
    >
      <div
        className={cn(
          'relative border-[1.5px] shadow-xs transition-[border-color,background-color]',
          'bg-card border-border/30 w-60 rounded-[15px]',
          className,
          selected && 'border-primary',
          executionStatus === 'RUNNING' && 'border-primary',
          executionStatus === 'SUCCEEDED' && 'border-workflow-node-success',
          executionStatus === 'FAILED' && 'border-workflow-node-failed',
        )}
      >
        {children}
      </div>
    </div>
  )
}
