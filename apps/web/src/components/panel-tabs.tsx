import { TabsList, TabsTrigger } from '@ai-workflow/ui/components/tabs'
import { cn } from '@ai-workflow/ui/lib/utils'
import type { ComponentProps } from 'react'

function PanelTabsList({ className, ...props }: ComponentProps<typeof TabsList>) {
  return (
    <TabsList
      className={cn('border-border h-10 w-full flex-nowrap gap-8 border-b-[0.5px] px-4', className)}
      {...props}
    />
  )
}

function PanelTabsTrigger({ className, ...props }: ComponentProps<typeof TabsTrigger>) {
  return (
    <TabsTrigger
      className={cn(
        'data-[state=active]:border-primary h-full min-w-0 rounded-none border-0 border-b-2 border-transparent bg-transparent px-0 text-sm hover:bg-transparent focus-visible:bg-transparent data-[state=active]:bg-transparent data-[state=active]:font-medium',
        className,
      )}
      {...props}
    />
  )
}

export { PanelTabsList, PanelTabsTrigger }
