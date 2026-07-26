import { type LucideIcon } from 'lucide-react'
import { type RouteObject } from 'react-router-dom'

import { type LayoutSidebarNavigationItem } from '@/components/layout-sidebar'

interface RouteNavigationMeta {
  title: string
  icon: LucideIcon
}

export function findRouteById(
  routeObjects: readonly RouteObject[],
  id: string,
): RouteObject | undefined {
  for (const route of routeObjects) {
    if (route.id === id) return route

    const childRoute = route.children ? findRouteById(route.children, id) : undefined
    if (childRoute) return childRoute
  }

  return undefined
}

export function getNavigationItemsFromRoute(
  routeObjects: readonly RouteObject[],
  routeId: string,
  basePath: string,
): LayoutSidebarNavigationItem[] {
  const route = findRouteById(routeObjects, routeId)

  return (route?.children ?? []).flatMap((childRoute) => {
    const meta = childRoute.handle?.meta as RouteNavigationMeta | undefined

    if (!childRoute.path || !meta?.title || !meta.icon) return []

    return [
      {
        to: `${basePath}/${childRoute.path}`,
        label: meta.title,
        icon: meta.icon,
      },
    ]
  })
}
