import { cn } from '@ai-workflow/ui/lib/utils'
import { Network } from 'lucide-react'

export interface WorkflowReferenceIconProps {
  icon?: string
  title: string
  size?: 'compact' | 'default'
}

export function WorkflowReferenceIcon({
  icon,
  title,
  size = 'default',
}: WorkflowReferenceIconProps) {
  return (
    <span
      title={title}
      aria-hidden
      className={cn(
        'border-border/60 bg-primary/10 flex shrink-0 items-center justify-center border-[0.5px] shadow-xs',
        size === 'compact'
          ? 'size-5 rounded-md text-xs [&>svg]:size-3'
          : 'size-8 rounded-lg text-base [&>svg]:size-4',
      )}
    >
      {icon ?? <Network className="text-primary" />}
    </span>
  )
}
