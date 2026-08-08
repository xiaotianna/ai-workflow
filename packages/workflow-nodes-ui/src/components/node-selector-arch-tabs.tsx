import { TabsList, TabsTrigger } from '@ai-workflow/ui/components/tabs'
import { cn } from '@ai-workflow/ui/lib/utils'
import type { ComponentProps } from 'react'

function NodeSelectorArchTabTrigger({
  className,
  children,
  ...props
}: ComponentProps<typeof TabsTrigger>) {
  return (
    <TabsTrigger
      className={cn(
        'relative z-0 min-w-0 shrink-0 rounded-none border-0 bg-transparent px-2 py-2 text-sm shadow-none transition-colors',
        'text-muted-foreground hover:text-foreground hover:bg-transparent',
        'data-[state=active]:bg-popover/95 data-[state=active]:text-primary focus-visible:bg-transparent data-[state=active]:z-10 data-[state=active]:font-medium',
        'data-[state=active]:hover:bg-popover/95 data-[state=active]:focus-visible:bg-popover/95 data-[state=active]:rounded-t-[10px]',
        'data-[state=active]:before:pointer-events-none data-[state=active]:before:absolute data-[state=active]:before:-bottom-px data-[state=active]:before:-left-2.5 data-[state=active]:before:size-2.5',
        'data-[state=active]:before:bg-[radial-gradient(circle_at_0_0,transparent_10px,var(--color-input)_10px)]',
        'data-[state=active]:after:pointer-events-none data-[state=active]:after:absolute data-[state=active]:after:-right-2.5 data-[state=active]:after:-bottom-px data-[state=active]:after:size-2.5',
        'data-[state=active]:after:bg-[radial-gradient(circle_at_100%_0,transparent_10px,var(--color-input)_10px)]',
        className,
      )}
      {...props}
    >
      <span className="relative z-10">{children}</span>
    </TabsTrigger>
  )
}

function NodeSelectorArchTabsList({ className, ...props }: ComponentProps<typeof TabsList>) {
  return (
    <TabsList
      className={cn(
        'bg-input h-auto w-full max-w-full flex-nowrap items-end justify-start gap-0.5 rounded-none rounded-t-xl px-2 pt-2 pb-0',
        className,
      )}
      {...props}
    />
  )
}

export { NodeSelectorArchTabTrigger, NodeSelectorArchTabsList }
