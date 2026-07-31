'use client'

import * as React from 'react'
import { Tabs as TabsPrimitive } from 'radix-ui'

import { cn } from '../lib/utils'

function Tabs({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Root>) {
  return <TabsPrimitive.Root data-slot="tabs" className={cn('min-w-0', className)} {...props} />
}

function TabsList({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.List>) {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      className={cn(
        'flex max-w-full min-w-0 flex-wrap items-center gap-1 bg-transparent p-0',
        className,
      )}
      {...props}
    />
  )
}

function TabsTrigger({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      data-slot="tabs-trigger"
      className={cn(
        'text-muted-foreground hover:bg-muted/70 hover:text-foreground focus-visible:bg-muted/70 focus-visible:text-foreground data-[state=active]:bg-muted data-[state=active]:text-foreground h-8 min-w-12 shrink-0 cursor-pointer touch-manipulation rounded-lg border border-transparent px-2.5 text-center text-[13px] leading-4 font-medium shadow-none transition-[background-color,color] outline-none disabled:cursor-not-allowed disabled:opacity-50 data-[state=active]:font-semibold motion-reduce:transition-none',
        className,
      )}
      {...props}
    />
  )
}

function TabsContent({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Content>) {
  return (
    <TabsPrimitive.Content
      data-slot="tabs-content"
      className={cn('min-w-0 outline-none', className)}
      {...props}
    />
  )
}

export { Tabs, TabsContent, TabsList, TabsTrigger }
