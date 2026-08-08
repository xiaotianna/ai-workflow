type ClassValue = string | false | null | undefined

function cn(...values: readonly ClassValue[]): string {
  return values.filter(Boolean).join(' ')
}

const TONE_CLASS_NAMES = {
  indigo: 'from-indigo-500/20 to-violet-500/10 text-indigo-700 dark:text-indigo-300',
  emerald: 'from-emerald-500/20 to-teal-500/10 text-emerald-700 dark:text-emerald-300',
  amber: 'from-amber-500/20 to-orange-500/10 text-amber-800 dark:text-amber-300',
  rose: 'from-rose-500/20 to-pink-500/10 text-rose-700 dark:text-rose-300',
} as const

export type GradientBadgeTone = keyof typeof TONE_CLASS_NAMES

interface GradientBadgeProps {
  readonly label: string
  readonly tone?: GradientBadgeTone
  readonly className?: string
}

export function GradientBadge({ label, tone = 'indigo', className }: GradientBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border border-white/20 bg-gradient-to-r px-2 py-0.5 text-[10px] font-semibold tracking-wide uppercase',
        TONE_CLASS_NAMES[tone],
        className,
      )}
    >
      {label}
    </span>
  )
}

interface PreviewPanelProps {
  readonly title: string
  readonly subtitle?: string
  readonly accentClassName?: string
  readonly footer?: string
}

export function PreviewPanel({
  title,
  subtitle,
  accentClassName = 'from-primary/15 to-primary/5',
  footer,
}: PreviewPanelProps) {
  return (
    <div
      className={cn(
        'border-border/60 overflow-hidden rounded-xl border bg-gradient-to-br p-3 shadow-xs',
        accentClassName,
      )}
    >
      <div className="space-y-1">
        <p className="text-foreground text-sm leading-5 font-semibold">{title}</p>
        {subtitle ? <p className="text-muted-foreground text-xs leading-4">{subtitle}</p> : null}
      </div>
      {footer ? (
        <p className="text-muted-foreground border-border/50 mt-3 border-t pt-2 text-[11px] leading-4">
          {footer}
        </p>
      ) : null}
    </div>
  )
}

export { cn }
