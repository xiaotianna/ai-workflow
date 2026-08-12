import { cn } from '@ai-workflow/ui/lib/utils'
import {
  cloneElement,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ReactElement,
  type ReactNode,
} from 'react'
import { createPortal } from 'react-dom'

interface TooltipProps {
  children: ReactElement<{ 'aria-describedby'?: string }>
  content: ReactNode
  side?: 'top' | 'bottom'
}

interface TooltipPosition {
  left: number
  side: 'top' | 'bottom'
  top: number
}

/**
 * 通用紧凑提示，通过 Portal 渲染以避免被父级滚动容器裁剪。
 */
export function Tooltip({ children, content, side = 'top' }: TooltipProps) {
  const tooltipId = useId(),
    triggerRef = useRef<HTMLSpanElement>(null),
    tooltipRef = useRef<HTMLSpanElement>(null),
    [open, setOpen] = useState(false),
    [position, setPosition] = useState<TooltipPosition>(),
    describedBy = [children.props['aria-describedby'], tooltipId].filter(Boolean).join(' ')

  useLayoutEffect(() => {
    if (!open) return

    function updatePosition() {
      const trigger = triggerRef.current,
        tooltip = tooltipRef.current
      if (!trigger || !tooltip) return

      const triggerRect = trigger.getBoundingClientRect(),
        tooltipRect = tooltip.getBoundingClientRect(),
        gap = 8,
        viewportPadding = 8,
        fitsTop = triggerRect.top - gap - tooltipRect.height >= viewportPadding,
        fitsBottom =
          triggerRect.bottom + gap + tooltipRect.height <= window.innerHeight - viewportPadding,
        resolvedSide =
          side === 'top'
            ? fitsTop || !fitsBottom
              ? 'top'
              : 'bottom'
            : fitsBottom || !fitsTop
              ? 'bottom'
              : 'top',
        halfWidth = tooltipRect.width / 2,
        minLeft = viewportPadding + halfWidth,
        maxLeft = window.innerWidth - viewportPadding - halfWidth,
        triggerCenter = triggerRect.left + triggerRect.width / 2

      setPosition({
        left: Math.min(Math.max(triggerCenter, minLeft), maxLeft),
        side: resolvedSide,
        top: resolvedSide === 'top' ? triggerRect.top - gap : triggerRect.bottom + gap,
      })
    }

    updatePosition()
    window.addEventListener('resize', updatePosition)
    window.addEventListener('scroll', updatePosition, true)

    return () => {
      window.removeEventListener('resize', updatePosition)
      window.removeEventListener('scroll', updatePosition, true)
    }
  }, [open, side])

  return (
    <span
      ref={triggerRef}
      className="relative inline-flex"
      onPointerEnter={() => setOpen(true)}
      onPointerLeave={() => setOpen(false)}
      onFocusCapture={() => setOpen(true)}
      onBlurCapture={() => setOpen(false)}
    >
      {cloneElement(children, { 'aria-describedby': describedBy })}
      {open && typeof document !== 'undefined'
        ? createPortal(
            <span
              ref={tooltipRef}
              id={tooltipId}
              role="tooltip"
              data-side={position?.side ?? side}
              style={{
                left: position?.left ?? 0,
                top: position?.top ?? 0,
                transform:
                  (position?.side ?? side) === 'top'
                    ? 'translate(-50%, -100%)'
                    : 'translateX(-50%)',
              }}
              className={cn(
                'border-border bg-background text-foreground pointer-events-none fixed z-60 flex h-7 max-w-[calc(100vw-1rem)] items-center overflow-hidden rounded-lg border-[0.5px] px-2 text-xs leading-none font-medium text-ellipsis whitespace-nowrap opacity-0 shadow-md transition-opacity duration-100',
                position && 'opacity-100',
              )}
            >
              {content}
            </span>,
            document.body,
          )
        : null}
    </span>
  )
}
