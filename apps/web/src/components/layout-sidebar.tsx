import { cn } from '@ai-workflow/ui/lib/utils'
import type { LucideIcon } from 'lucide-react'
import { NavLink } from 'react-router-dom'

import { routes } from '@/router'

import { UserAvatar } from './user-avatar'

const navigationItems =
  routes
    .find((route) => route.id === 'root')
    ?.children?.find((route) => route.id === 'layout')
    ?.children?.flatMap((route) => {
      const { meta } = route.handle

      if (!route.path || !('icon' in meta) || !meta.icon) return []

      return [{ label: meta.title, href: `/${route.path}`, icon: meta.icon }]
    }) ?? []

interface LayoutSidebarProps {
  username: string
}

function SidebarNavItem({
  href,
  label,
  icon: Icon,
}: {
  href: string
  label: string
  icon: LucideIcon
}) {
  return (
    <NavLink
      to={href}
      end
      className={cn(
        'group relative flex h-8 w-full items-center gap-2 rounded-[10px] border-x border-y-0 border-x-transparent px-2 py-1.5 text-sm font-medium outline-hidden transition-[background-color,border-color,color,box-shadow]',
        'not-aria-[current=page]:text-muted-foreground not-aria-[current=page]:hover:bg-muted not-aria-[current=page]:bg-transparent',
        'aria-[current=page]:border-x-primary aria-[current=page]:bg-primary/10 aria-[current=page]:text-primary aria-[current=page]:z-1 aria-[current=page]:shadow-sm aria-[current=page]:backdrop-blur-sm',
        'focus-visible:border-input-focus not-aria-[current=page]:focus-visible:bg-sidebar-accent not-aria-[current=page]:focus-visible:text-sidebar-accent-foreground focus-visible:shadow-sm',
      )}
    >
      <Icon className="size-4 shrink-0" />
      <span className="truncate">{label}</span>
    </NavLink>
  )
}

export function LayoutSidebar({ username }: LayoutSidebarProps) {
  return (
    <aside className="border-border/70 flex w-60 shrink-0 flex-col">
      <div className="px-4 pt-4 pb-4">
        <NavLink to="/" className="flex items-center gap-2 text-base font-semibold tracking-tight">
          <img src="/logo.svg" alt="" className="size-9 shrink-0 object-contain" />
          <span>AI Workflow</span>
        </NavLink>
      </div>

      <nav className="flex flex-1 flex-col gap-1 px-3">
        {navigationItems.map((item) => (
          <SidebarNavItem key={item.href} {...item} />
        ))}
      </nav>

      <div className="relative p-3">
        <div className="flex items-center gap-2.5 rounded-lg px-1 py-1">
          <UserAvatar username={username} />
          <span className="min-w-0 flex-1 truncate text-sm font-medium">{username}</span>
        </div>
      </div>
    </aside>
  )
}
