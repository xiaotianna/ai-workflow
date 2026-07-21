import { cn } from '@ai-workflow/ui/lib/utils'
import { BookOpen, Puzzle, Users, type LucideIcon } from 'lucide-react'
import { NavLink, useLocation } from 'react-router-dom'

import { UserAvatar } from './user-avatar'

const navigationItems = [
  {
    label: '工作室',
    href: '/studio',
    icon: Users,
  },
  {
    label: '知识库',
    href: '/knowledge-base',
    icon: BookOpen,
  },
  {
    label: '插件',
    href: '/plugin',
    icon: Puzzle,
  },
]

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
  const { pathname } = useLocation()
  const isActive = pathname === href

  return (
    <NavLink
      to={href}
      className={cn(
        'flex h-10 items-center gap-2.5 rounded-r-3xl px-5 text-sm font-medium transition-colors',
        isActive
          ? 'bg-primary/10 text-primary'
          : 'text-muted-foreground hover:bg-muted hover:text-foreground',
      )}
    >
      <Icon className={cn('size-4.5 shrink-0', isActive && 'text-primary')} />
      <span>{label}</span>
    </NavLink>
  )
}

export function LayoutSidebar({ username }: LayoutSidebarProps) {
  return (
    <aside className="border-border/70 flex w-60 shrink-0 flex-col">
      <div className="px-4 pt-4 pb-3">
        <NavLink
          to="/studio"
          className="flex items-center gap-2 text-base font-semibold tracking-tight"
        >
          <img src="/logo.svg" alt="" className="size-9 shrink-0 object-contain" />
          <span>AI Workflow</span>
        </NavLink>
      </div>

      <nav className="flex flex-1 flex-col gap-1">
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
