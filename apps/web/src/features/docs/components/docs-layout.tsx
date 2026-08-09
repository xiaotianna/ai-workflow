import { Outlet } from 'react-router-dom'

import type { DocsNavigationGroup } from '../navigation'
import type { DocsProject } from '../projects'
import { DocsMobileNavigation, DocsSidebar } from './docs-navigation'

interface DocsLayoutProps {
  activeProject: DocsProject
  navigationGroups: readonly DocsNavigationGroup[]
}

export function DocsLayout({ activeProject, navigationGroups }: DocsLayoutProps) {
  return (
    <div className="bg-input h-svh min-w-0 overflow-hidden p-1 sm:p-2">
      <div className="border-border/50 bg-background flex h-full min-w-0 overflow-hidden rounded-xl border-[0.5px] shadow-xs">
        <DocsSidebar activeProject={activeProject} groups={navigationGroups} />

        <div className="flex min-w-0 flex-1 flex-col">
          <DocsMobileNavigation activeProject={activeProject} groups={navigationGroups} />
          <main className="min-h-0 min-w-0 flex-1 overflow-y-auto">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  )
}
