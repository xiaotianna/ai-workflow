import { cn } from '@ai-workflow/ui/lib/utils'
import { cloneElement, useId, type ReactElement, type ReactNode } from 'react'

interface TooltipProps {
  children: ReactElement<{ 'aria-describedby'?: string }>
  content: ReactNode
  side?: 'top' | 'bottom'
}

/**
 * 通用紧凑提示，只在鼠标 Hover 时展示。
 */
export function Tooltip({ children, content, side = 'top' }: TooltipProps) {
  const tooltipId = useId()
  const describedBy = [children.props['aria-describedby'], tooltipId].filter(Boolean).join(' ')

  return (
    <span className="group/tooltip relative inline-flex">
      {cloneElement(children, { 'aria-describedby': describedBy })}
      <span
        id={tooltipId}
        role="tooltip"
        className={cn(
          'border-border bg-background text-foreground pointer-events-none invisible absolute left-1/2 z-50 flex h-7 -translate-x-1/2 items-center rounded-lg border-[0.5px] px-2 text-xs leading-none font-medium whitespace-nowrap opacity-0 shadow-md transition-[opacity,transform,visibility] duration-100',
          'group-hover/tooltip:visible group-hover/tooltip:translate-y-0 group-hover/tooltip:opacity-100',
          side === 'top'
            ? 'bottom-[calc(100%+8px)] translate-y-1'
            : 'top-[calc(100%+8px)] -translate-y-1',
        )}
      >
        {content}
      </span>
    </span>
  )
}
