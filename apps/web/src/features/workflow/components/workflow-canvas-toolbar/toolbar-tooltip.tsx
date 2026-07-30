import { Tooltip } from '@/components/tooltip'
import type { ReactElement } from 'react'

interface ToolbarTooltipProps {
  children: ReactElement<{ 'aria-describedby'?: string }>
  label: string
  shortcut: readonly string[]
}

export function ToolbarTooltip({ children, label, shortcut }: ToolbarTooltipProps) {
  return (
    <Tooltip
      content={
        <>
          <span>{label}</span>
          <span className="ml-1.5 flex items-center gap-0.5" aria-hidden>
            {shortcut.map((key, index) => (
              <kbd
                key={`${key}-${index}`}
                className="bg-muted text-muted-foreground flex size-4 items-center justify-center rounded-sm font-sans text-[10px] leading-none font-medium"
              >
                {key}
              </kbd>
            ))}
          </span>
        </>
      }
    >
      {children}
    </Tooltip>
  )
}
