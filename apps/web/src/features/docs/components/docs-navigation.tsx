import { cn } from '@ai-workflow/ui/lib/utils'
import { ArrowLeft } from 'lucide-react'
import { Link, NavLink } from 'react-router-dom'

import type { DocsNavigationGroup, DocsNavigationItem } from '../navigation'
import type { DocsProject } from '../projects'
import { DocsProjectSwitcher } from './docs-project-switcher'

interface DocsNavigationProps {
  activeProject: DocsProject
  groups: readonly DocsNavigationGroup[]
}

function DocsNavigationLink({ icon: Icon, label, to }: DocsNavigationItem) {
  return (
    <NavLink
      to={to}
      end
      className={({ isActive }) =>
        cn(
          'text-muted-foreground flex h-8 w-full cursor-pointer items-center gap-2 rounded-[10px] border-x border-y-0 border-x-transparent px-2.5 text-sm font-medium outline-hidden transition-[background-color,border-color,color,box-shadow]',
          'hover:bg-muted focus-visible:border-input-focus focus-visible:bg-sidebar-accent focus-visible:text-sidebar-accent-foreground focus-visible:shadow-sm',
          isActive &&
            'border-x-primary bg-primary/10 text-primary hover:bg-primary/10 hover:text-primary z-1 shadow-sm backdrop-blur-sm',
        )
      }
    >
      <Icon aria-hidden className="size-4 shrink-0" />
      <span className="truncate">{label}</span>
    </NavLink>
  )
}

export function DocsSidebar({ activeProject, groups }: DocsNavigationProps) {
  return (
    <aside className="border-border/70 bg-background hidden h-full w-64 shrink-0 flex-col border-r-[0.5px] md:flex">
      <div className="p-2">
        <DocsProjectSwitcher activeProject={activeProject} />
      </div>

      <nav aria-label="文档导航" className="min-h-0 flex-1 overflow-y-auto px-3 py-2">
        {groups.map((group, index) => (
          <section key={group.label} className={cn(index > 0 && 'mt-6')}>
            <h2 className="text-muted-foreground mb-1 px-2.5 text-xs leading-5 font-semibold tracking-wide uppercase">
              {group.label}
            </h2>
            <div className="space-y-1">
              {group.items.map((item) => (
                <DocsNavigationLink key={item.to} {...item} />
              ))}
            </div>
          </section>
        ))}
      </nav>

      <div className="border-border/70 border-t-[0.5px] p-3">
        <Link
          to="/"
          className="text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:bg-accent focus-visible:text-accent-foreground flex h-9 w-fit cursor-pointer items-center gap-2 rounded-lg px-2.5 text-[14px] leading-5 font-medium outline-hidden transition-colors"
        >
          <ArrowLeft aria-hidden className="size-4" />
          返回应用
        </Link>
      </div>
    </aside>
  )
}

export function DocsMobileNavigation({ activeProject, groups }: DocsNavigationProps) {
  const items = groups.flatMap((group) => group.items)

  return (
    <header className="border-border/70 bg-background shrink-0 border-b-[0.5px] md:hidden">
      <div className="px-2 pt-2">
        <DocsProjectSwitcher activeProject={activeProject} />
      </div>
      <nav aria-label="移动端文档导航" className="flex gap-1 overflow-x-auto px-3 py-2">
        {items.map(({ icon: Icon, label, to }) => (
          <NavLink
            key={to}
            to={to}
            end
            className={({ isActive }) =>
              cn(
                'text-muted-foreground hover:bg-muted focus-visible:bg-accent focus-visible:text-accent-foreground flex h-8 shrink-0 cursor-pointer items-center gap-2 rounded-lg px-3 text-sm font-medium outline-hidden transition-colors',
                isActive && 'bg-primary/10 text-primary hover:bg-primary/10 hover:text-primary',
              )
            }
          >
            <Icon aria-hidden className="size-4" />
            {label}
          </NavLink>
        ))}
      </nav>
    </header>
  )
}
