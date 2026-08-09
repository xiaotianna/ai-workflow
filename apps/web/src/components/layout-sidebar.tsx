import { cn } from '@ai-workflow/ui/lib/utils'
import { type LucideIcon } from 'lucide-react'
import { type ReactNode } from 'react'
import { NavLink } from 'react-router-dom'

import { AccountMenu } from '@/features/account'

import { HelpMenu } from './help-menu'

export interface LayoutSidebarNavigationItem {
  to: string
  label: string
  icon: LucideIcon
}

interface LayoutSidebarProps {
  header: ReactNode
  items: readonly LayoutSidebarNavigationItem[]
  navigationLabel: string
}

function SidebarNavItem({ to, label, icon: Icon }: LayoutSidebarNavigationItem) {
  return (
    <NavLink
      to={to}
      end
      className={cn(
        'group relative flex h-8 w-full cursor-pointer items-center gap-2 rounded-[10px] border-x border-y-0 border-x-transparent px-2 py-1.5 text-sm font-medium outline-hidden transition-[background-color,border-color,color,box-shadow]',
        'not-aria-[current=page]:text-muted-foreground not-aria-[current=page]:hover:bg-muted not-aria-[current=page]:bg-transparent',
        'aria-[current=page]:border-x-primary aria-[current=page]:bg-primary/10 aria-[current=page]:text-primary aria-[current=page]:z-1 aria-[current=page]:shadow-sm aria-[current=page]:backdrop-blur-sm',
        'focus-visible:border-input-focus not-aria-[current=page]:focus-visible:bg-sidebar-accent not-aria-[current=page]:focus-visible:text-sidebar-accent-foreground focus-visible:shadow-sm',
      )}
    >
      <Icon aria-hidden className="size-4 shrink-0" />
      <span className="truncate">{label}</span>
    </NavLink>
  )
}

export function LayoutSidebar({ header, items, navigationLabel }: LayoutSidebarProps) {
  return (
    <aside className="border-border/70 flex min-h-0 w-60 shrink-0 flex-col">
      {header}

      <nav aria-label={navigationLabel} className="flex flex-1 flex-col gap-1 px-3">
        {items.map((item) => (
          <SidebarNavItem key={item.to} {...item} />
        ))}
      </nav>

      <div className="relative flex min-w-0 items-center gap-2 p-3">
        <AccountMenu className="min-w-0 flex-1" />
        <HelpMenu />
      </div>
    </aside>
  )
}
