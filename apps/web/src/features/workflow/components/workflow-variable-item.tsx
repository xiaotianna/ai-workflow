import { cn } from '@ai-workflow/ui/lib/utils'
import type { ComponentProps, ReactNode } from 'react'

interface WorkflowVariableItemProps extends Omit<ComponentProps<'div'>, 'children'> {
  actions?: ReactNode
  dataType: string
  description: string
  icon: ReactNode
  name: string
  prefix?: string
}

export function WorkflowVariableItem({
  actions,
  className,
  dataType,
  description,
  icon,
  name,
  prefix,
  ...props
}: WorkflowVariableItemProps) {
  const variableKey = `${prefix ?? ''}${name}`

  return (
    <div
      {...props}
      className={cn(
        'border-border/60 bg-background hover:bg-input rounded-lg border px-2.5 py-2 shadow-xs transition-[background-color,box-shadow] hover:shadow-md',
        className,
      )}
    >
      <div className="flex min-w-0 items-center justify-between gap-2">
        <div className="flex min-w-0 flex-1 items-center gap-1">
          {icon}
          <div className="text-foreground min-w-0 truncate text-sm font-medium" title={variableKey}>
            {prefix ? <span className="text-muted-foreground">{prefix}</span> : null}
            {name}
          </div>
          <div className="text-muted-foreground shrink-0 text-xs font-medium">{dataType}</div>
        </div>
        {actions ? <div className="shrink-0">{actions}</div> : null}
      </div>
      <div
        className="text-muted-foreground mt-1.5 truncate text-xs font-normal"
        title={description}
      >
        {description}
      </div>
    </div>
  )
}
