import { cloneElement, useId, type ReactElement } from 'react'

interface ToolbarTooltipProps {
  children: ReactElement<{ 'aria-describedby'?: string }>
  label: string
  shortcut: readonly string[]
}

/**
 * 画布工具栏操作提示，使用原生结构实现紧凑白底浮层与快捷键键帽。
 */
export function ToolbarTooltip({ children, label, shortcut }: ToolbarTooltipProps) {
  const tooltipId = useId()
  const describedBy = [children.props['aria-describedby'], tooltipId].filter(Boolean).join(' ')

  return (
    <span className="group/toolbar-tooltip relative inline-flex">
      {cloneElement(children, { 'aria-describedby': describedBy })}
      <span
        id={tooltipId}
        role="tooltip"
        className="border-border bg-background text-foreground pointer-events-none invisible absolute bottom-[calc(100%+8px)] left-1/2 z-50 flex h-7 -translate-x-1/2 translate-y-1 items-center gap-1.5 rounded-lg border-[0.5px] px-2 text-xs leading-none font-medium whitespace-nowrap opacity-0 shadow-md transition-[opacity,transform,visibility] duration-100 group-focus-within/toolbar-tooltip:visible group-focus-within/toolbar-tooltip:translate-y-0 group-focus-within/toolbar-tooltip:opacity-100 group-hover/toolbar-tooltip:visible group-hover/toolbar-tooltip:translate-y-0 group-hover/toolbar-tooltip:opacity-100"
      >
        <span>{label}</span>
        <span className="flex items-center gap-0.5" aria-hidden>
          {shortcut.map((key, index) => (
            <kbd
              key={`${key}-${index}`}
              className="bg-muted text-muted-foreground flex size-4 items-center justify-center rounded-sm font-sans text-[10px] leading-none font-medium"
            >
              {key}
            </kbd>
          ))}
        </span>
      </span>
    </span>
  )
}
