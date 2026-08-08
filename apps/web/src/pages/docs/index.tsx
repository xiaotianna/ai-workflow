import { DocsLayout, getDocsNavigationGroupsFromRoute } from '@/features/docs'
import { routes } from '@/router'

export default function DocsPage() {
  return <DocsLayout navigationGroups={getDocsNavigationGroupsFromRoute(routes, 'docs', '/docs')} />
}
