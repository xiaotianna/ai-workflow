import { Button } from '@ai-workflow/ui/components/button'
import { ChevronLeft, SlidersHorizontal, type LucideIcon } from 'lucide-react'
import { Link, Outlet, type RouteObject, useParams } from 'react-router-dom'

import { LayoutSidebar } from '@/components/layout-sidebar'
import { initialStudioApps } from '@/features/studio'
import { routes } from '@/router'

interface AppNavigationMeta {
  title: string
  icon: LucideIcon
}

interface AppNavigationItem extends AppNavigationMeta {
  path: string
}

function findRouteById(routeObjects: readonly RouteObject[], id: string): RouteObject | undefined {
  for (const route of routeObjects) {
    if (route.id === id) return route

    const childRoute = route.children ? findRouteById(route.children, id) : undefined
    if (childRoute) return childRoute
  }

  return undefined
}

function getAppNavigationItems(): AppNavigationItem[] {
  const appRoute = findRouteById(routes, 'app')

  return (appRoute?.children ?? []).flatMap((route) => {
    const meta = route.handle?.meta as AppNavigationMeta | undefined

    if (!route.path || !meta?.title || !meta.icon) return []

    return [{ path: route.path, ...meta }]
  })
}

const navigationItems = getAppNavigationItems()
const defaultIconBackground = 'rgb(255, 234, 213)'

export default function AppPage() {
  const { id } = useParams<{ id: string }>()
  const app = initialStudioApps.find((item) => item.id === id)
  const title = app?.title ?? '未命名应用'
  const kindLabel = app?.kindLabel ?? '工作流'
  const encodedAppId = encodeURIComponent(id ?? '')

  return (
    <div className="flex h-svh min-w-0 gap-1 overflow-hidden bg-[#f2f4f7] p-1">
      <div className="bg-background border-border flex h-full rounded-lg shadow-xs">
        <LayoutSidebar
          header={
            <div className="flex flex-col px-2 py-2">
              <Button
                asChild
                variant="ghost"
                size="sm"
                className="text-muted-foreground w-fit justify-start self-start px-1"
              >
                <Link to="/studio" aria-label="返回">
                  <ChevronLeft aria-hidden />
                  <span className="mr-1">/</span>
                  <span>工作室</span>
                </Link>
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="text-foreground h-auto w-full justify-start p-0 font-normal hover:bg-transparent"
                aria-label={`${title}，${kindLabel}`}
              >
                <div className="hover:bg-muted flex w-full items-start gap-2 rounded-xl p-2">
                  <span
                    className="border-border/80 relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-[10px] border-[0.5px] text-[24px] leading-none"
                    style={{ background: defaultIconBackground }}
                  >
                    <span aria-hidden>{app?.icon ?? '🤖'}</span>
                  </span>
                  <div className="flex min-w-0 flex-1 flex-col items-start justify-center gap-0.5 self-stretch">
                    <div className="flex w-full min-w-0 pr-1">
                      <div className="text-text-secondary truncate text-sm/5 font-semibold">
                        {title}
                      </div>
                    </div>
                    <div className="text-muted-foreground truncate text-[10px] leading-3 font-medium tracking-wide uppercase">
                      {kindLabel}
                    </div>
                  </div>
                  <div className="flex size-5 shrink-0 items-center justify-center rounded-md p-0.5">
                    <SlidersHorizontal
                      aria-hidden
                      className="text-muted-foreground size-4"
                      strokeWidth={2}
                    />
                  </div>
                </div>
              </Button>
            </div>
          }
          items={navigationItems.map(({ path, title: label, icon }) => ({
            to: `/app/${encodedAppId}/${path}`,
            label,
            icon,
          }))}
          navigationLabel="应用导航"
        />
      </div>

      <main className="border-border bg-background min-h-0 min-w-0 flex-1 overflow-auto rounded-lg shadow-xs">
        <Outlet />
      </main>
    </div>
  )
}
