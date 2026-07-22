import { NavLink, Outlet } from 'react-router-dom'

import { LayoutSidebar } from '@/components/layout-sidebar'
import { routes } from '@/router'

const navigationItems =
  routes
    .find((route) => route.id === 'root')
    ?.children?.find((route) => route.id === 'layout')
    ?.children?.flatMap((route) => {
      const { meta } = route.handle

      if (!route.path || !('icon' in meta) || !meta.icon) return []

      return [{ label: meta.title, to: `/${route.path}`, icon: meta.icon }]
    }) ?? []

export default function LayoutPage() {
  return (
    <div className="bg-muted/35 flex h-svh min-w-0 overflow-hidden p-1">
      <LayoutSidebar
        header={
          <div className="p-4">
            <NavLink
              to="/"
              className="flex items-center gap-2 text-base font-semibold tracking-tight"
            >
              <img src="/logo.svg" alt="" className="size-9 shrink-0 object-contain" />
              <span>AI Workflow</span>
            </NavLink>
          </div>
        }
        items={navigationItems}
        navigationLabel="主导航"
      />

      <main className="min-h-0 min-w-0 flex-1 overflow-auto px-8 py-6">
        <Outlet />
      </main>
    </div>
  )
}
