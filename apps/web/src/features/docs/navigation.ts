import type { LucideIcon } from 'lucide-react'
import type { RouteObject } from 'react-router-dom'

import { findRouteById } from '@/router/navigation'

interface DocsRouteMeta {
  title: string
  icon: LucideIcon
  navigationGroup?: string
}

export interface DocsNavigationItem {
  icon: LucideIcon
  label: string
  to: string
}

export interface DocsNavigationGroup {
  items: DocsNavigationItem[]
  label: string
}

export function getDocsNavigationGroupsFromRoute(
  routeObjects: readonly RouteObject[],
  routeId: string,
  basePath: string,
): DocsNavigationGroup[] {
  const route = findRouteById(routeObjects, routeId),
    groups = new Map<string, DocsNavigationItem[]>()

  for (const childRoute of route?.children ?? []) {
    const meta = childRoute.handle?.meta as DocsRouteMeta | undefined,
      to = childRoute.index ? basePath : childRoute.path ? `${basePath}/${childRoute.path}` : null

    if (!to || !meta?.title || !meta.icon) continue

    const groupLabel = meta.navigationGroup ?? '文档',
      groupItems = groups.get(groupLabel) ?? []
    groupItems.push({
      to,
      label: meta.title,
      icon: meta.icon,
    })
    groups.set(groupLabel, groupItems)
  }

  return Array.from(groups, ([label, items]) => ({ label, items }))
}
