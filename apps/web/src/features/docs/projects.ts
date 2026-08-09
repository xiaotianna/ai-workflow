export interface DocsProject {
  description: string
  id: 'ai-workflow' | 'project' | 'plugin'
  logoSrc: string
  name: string
  navigationRouteId: string
  path: string
}

export const DOCS_PROJECTS = [
  {
    id: 'ai-workflow',
    name: 'AI Workflow',
    description: '部署与使用',
    path: '/docs/ai-workflow',
    navigationRouteId: 'docs-ai-workflow',
    logoSrc: '/logo.svg',
  },
  {
    id: 'project',
    name: '项目介绍',
    description: '项目亮点与简历表达',
    path: '/docs/project',
    navigationRouteId: 'docs-project',
    logoSrc: '/project-logo.svg',
  },
  {
    id: 'plugin',
    name: '插件开发',
    description: '插件 SDK 与开发指南',
    path: '/docs/plugin',
    navigationRouteId: 'docs-plugin',
    logoSrc: '/plugin-logo.svg',
  },
] as const satisfies readonly DocsProject[]

export function getDocsProjectFromPath(pathname: string): DocsProject {
  return (
    DOCS_PROJECTS.find(
      (project) => pathname === project.path || pathname.startsWith(`${project.path}/`),
    ) ?? DOCS_PROJECTS[0]
  )
}
