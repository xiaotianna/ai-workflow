import type { ReactNode } from 'react'

interface MetricTileProps {
  readonly label: string
  readonly value: string
  readonly delta?: string
  readonly trend?: 'up' | 'down' | 'flat'
}

const TREND_LABELS = {
  up: '↑',
  down: '↓',
  flat: '→',
} as const

export function MetricTile({ label, value, delta, trend = 'flat' }: MetricTileProps) {
  return (
    <div className="bg-background/80 border-border/70 flex min-w-0 flex-col gap-1 rounded-lg border p-2.5 shadow-xs">
      <span className="text-muted-foreground truncate text-[10px] leading-4 font-medium uppercase">
        {label}
      </span>
      <div className="flex items-end justify-between gap-2">
        <span className="text-foreground truncate text-lg leading-6 font-semibold tabular-nums">
          {value}
        </span>
        {delta ? (
          <span
            className={
              trend === 'up'
                ? 'text-[11px] font-medium text-emerald-600 tabular-nums dark:text-emerald-400'
                : trend === 'down'
                  ? 'text-[11px] font-medium text-rose-600 tabular-nums dark:text-rose-400'
                  : 'text-muted-foreground text-[11px] font-medium tabular-nums'
            }
          >
            {TREND_LABELS[trend]} {delta}
          </span>
        ) : null}
      </div>
    </div>
  )
}

interface MetricGridProps {
  readonly children: ReactNode
}

export function MetricGrid({ children }: MetricGridProps) {
  return <div className="grid grid-cols-2 gap-2">{children}</div>
}
