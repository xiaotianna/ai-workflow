import { cn } from '@ai-workflow/ui/lib/utils'

interface WorkflowShortcutKeysProps {
  keys: readonly (readonly string[])[]
  className?: string
}

export function WorkflowShortcutKeys({ keys, className }: WorkflowShortcutKeysProps) {
  return (
    <span className={cn('flex shrink-0 items-center gap-1.5', className)}>
      {keys.map((keyCombination, combinationIndex) => (
        <span key={keyCombination.join('-')} className="flex items-center gap-1">
          {combinationIndex > 0 ? <span className="text-muted-foreground text-xs">或</span> : null}
          {keyCombination.map((key) => (
            <kbd
              key={key}
              className="border-border bg-muted text-muted-foreground min-w-6 rounded-md border-[0.5px] px-1.5 py-1 text-center font-mono text-[11px] leading-3 shadow-xs"
            >
              {key}
            </kbd>
          ))}
        </span>
      ))}
    </span>
  )
}
