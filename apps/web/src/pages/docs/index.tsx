import {
  DocsLayout,
  getDocsNavigationGroupsFromRoute,
  getDocsProjectFromPath,
} from '@/features/docs'
import { routes } from '@/router'
import { useLocation } from 'react-router-dom'

export default function DocsPage() {
  const { pathname } = useLocation(),
    activeProject = getDocsProjectFromPath(pathname)

  return (
    <DocsLayout
      activeProject={activeProject}
      navigationGroups={getDocsNavigationGroupsFromRoute(
        routes,
        activeProject.navigationRouteId,
        activeProject.path,
      )}
    />
  )
}
