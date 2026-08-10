import { cn } from '@ai-workflow/ui/lib/utils'

interface KnowledgeRetrievalMethodIconProps {
  className?: string
}

export function KnowledgeRetrievalMethodIcon({ className }: KnowledgeRetrievalMethodIconProps) {
  return (
    <span
      aria-hidden
      className={cn('text-primary grid size-3.5 shrink-0 grid-cols-3 gap-px', className)}
    >
      <span className="rounded-[1px] bg-current" />
      <span className="rounded-[1px] bg-current" />
      <span className="rounded-[1px] bg-current" />
      <span className="rounded-[1px] bg-current" />
      <span className="rounded-[1px] bg-current" />
      <span className="rounded-[1px] bg-current" />
      <span className="rounded-[1px] bg-current" />
      <span className="rounded-[1px] bg-current" />
      <span className="rounded-[1px] bg-current" />
    </span>
  )
}
