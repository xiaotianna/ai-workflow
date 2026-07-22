import {
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@ai-workflow/ui/components/dropdown-menu'
import { cn } from '@ai-workflow/ui/lib/utils'
import { Fragment, type ComponentPropsWithoutRef, type ReactNode } from 'react'

export interface ActionMenuAction {
  id: string
  label: ReactNode
  onSelect: () => void
  icon?: ReactNode
  disabled?: boolean
  destructive?: boolean
  separatorBefore?: boolean
}

export interface ActionMenuContentProps extends Omit<
  ComponentPropsWithoutRef<typeof DropdownMenuContent>,
  'children'
> {
  actions: readonly ActionMenuAction[]
}

export function ActionMenuContent({
  actions,
  align = 'end',
  className,
  ...props
}: ActionMenuContentProps) {
  return (
    <DropdownMenuContent align={align} className={cn('w-48', className)} {...props}>
      {actions.map((action, index) => (
        <Fragment key={action.id}>
          {action.separatorBefore && index > 0 ? <DropdownMenuSeparator /> : undefined}
          <DropdownMenuItem
            disabled={action.disabled}
            onSelect={action.onSelect}
            className={cn(
              action.destructive &&
                'text-destructive data-highlighted:bg-destructive/10 data-highlighted:text-destructive',
            )}
          >
            {action.icon}
            <span>{action.label}</span>
          </DropdownMenuItem>
        </Fragment>
      ))}
    </DropdownMenuContent>
  )
}
