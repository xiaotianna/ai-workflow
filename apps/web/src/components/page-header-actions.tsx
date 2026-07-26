import { cn } from '@ai-workflow/ui/lib/utils'
import { type ReactNode } from 'react'

export interface PageHeaderActionsProps {
  children: ReactNode
  className?: string
}

export function PageHeaderActions({ children, className }: PageHeaderActionsProps) {
  return <div className={cn('mt-5 flex flex-wrap items-center gap-2', className)}>{children}</div>
}
