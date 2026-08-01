import { cn } from '@ai-workflow/ui/lib/utils'
import { BookOpen } from 'lucide-react'

export interface KnowledgeBaseReferenceIconProps {
  icon?: string
  title: string
  size?: 'compact' | 'default'
}

export function KnowledgeBaseReferenceIcon({
  icon,
  title,
  size = 'default',
}: KnowledgeBaseReferenceIconProps) {
  return (
    <span
      title={title}
      aria-hidden
      className={cn(
        'border-border/60 bg-warning/10 flex shrink-0 items-center justify-center border-[0.5px] shadow-xs',
        size === 'compact'
          ? 'size-5 rounded-md text-xs [&>svg]:size-3'
          : 'size-8 rounded-lg text-base [&>svg]:size-4',
      )}
    >
      {icon ?? <BookOpen className="text-warning" />}
    </span>
  )
}
