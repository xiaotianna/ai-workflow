import { cn } from '@ai-workflow/ui/lib/utils'
import { type ReactNode } from 'react'

export interface PageContentProps {
  children: ReactNode
  className?: string
}

export function PageContent({ children, className }: PageContentProps) {
  return <div className={cn('relative min-h-0 flex-1', className)}>{children}</div>
}
