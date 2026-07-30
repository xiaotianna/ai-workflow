import { cn } from '@ai-workflow/ui/lib/utils'
import { Plus } from 'lucide-react'
import type { ComponentProps } from 'react'

export function AddNodeIconButton({
  className,
  type = 'button',
  ...props
}: ComponentProps<'button'>) {
  return (
    <button
      type={type}
      aria-label="添加节点"
      className={cn(
        'bg-primary text-primary-foreground hover:bg-primary/90',
        'flex size-5 shrink-0 cursor-pointer items-center justify-center rounded-full border-0 shadow-sm',
        'transition-[background-color,opacity,transform] active:scale-95',
        'focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50',
        className,
      )}
      {...props}
    >
      <Plus className="size-3" strokeWidth={3} aria-hidden />
    </button>
  )
}
