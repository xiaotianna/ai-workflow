import { lazy } from 'react'
import {
  BookMarked,
  BookOpenText,
  Code2,
  Computer,
  Download,
  FileText,
  Lightbulb,
  PackageOpen,
  Rocket,
  ServerCog,
  Sparkles,
  Target,
  Workflow,
  ScrollText,
  SquareMousePointer,
  SquareTerminal,
  ToolCase,
  ToyBrick,
} from 'lucide-react'
import { createBrowserRouter, Navigate, type RouteObject } from 'react-router-dom'

import App from '../App'
import LazyLoad from '../components/lazy-load'

const AuthPage = lazy(() => import('../pages/auth'))
const LayoutPage = lazy(() => import('../pages/home-layout'))
const KnowledgeBasePage = lazy(() => import('../pages/home-layout/knowledge-base'))
const ModelsPage = lazy(() => import('../pages/home-layout/models'))
const PluginPage = lazy(() => import('../pages/home-layout/plugin'))
const StudioPage = lazy(() => import('../pages/home-layout/studio'))
const PluginDetailPage = lazy(() => import('../pages/plugin-detail'))
const AppPage = lazy(() => import('../pages/app'))
const AppWorkflowPage = lazy(() => import('../pages/app/workflow'))
const AppApiPage = lazy(() => import('../pages/app/api'))
const AppLogsPage = lazy(() => import('../pages/app/logs'))
const KnowledgeBaseDetailPage = lazy(() => import('../pages/knowledge-base'))
const KnowledgeBaseDocumentsPage = lazy(() => import('../pages/knowledge-base/documents'))
const KnowledgeBaseRecallTestPage = lazy(() => import('../pages/knowledge-base/recall-test'))
const SharedAppApiPage = lazy(() => import('../pages/shared/app-api'))
const DocsPage = lazy(() => import('../pages/docs'))
const DocsOverviewPage = lazy(() => import('../pages/docs/overview'))
const DocsGettingStartedPage = lazy(() => import('../pages/docs/getting-started'))
const DocsWorkflowBasicsPage = lazy(() => import('../pages/docs/workflow-basics'))
const DocsDeploymentPage = lazy(() => import('../pages/docs/deployment'))
const DocsProjectOverviewPage = lazy(() => import('../pages/docs/project-overview'))
const DocsProjectHighlightsPage = lazy(() => import('../pages/docs/project-highlights'))
const DocsProjectResumePage = lazy(() => import('../pages/docs/project-resume'))
const DocsPluginOverviewPage = lazy(() => import('../pages/docs/plugin-overview'))
const DocsPluginGettingStartedPage = lazy(() => import('../pages/docs/plugin-getting-started'))
const DocsPluginDevelopmentPage = lazy(() => import('../pages/docs/plugin-development'))

export const routes = [
  {
    id: 'root',
    path: '/',
    element: <App />,
    handle: {
      meta: {
        title: '应用',
        requiresAuth: true,
      },
    },
    children: [
      {
        id: 'layout',
        element: (
          <LazyLoad>
            <LayoutPage />
          </LazyLoad>
        ),
        handle: {
          meta: {
            title: '首页',
            requiresAuth: true,
          },
        },
        children: [
          {
            id: 'root-index',
            index: true,
            element: <Navigate to="/studio" replace />,
            handle: {
              meta: {
                title: '首页',
                requiresAuth: true,
              },
            },
          },
          {
            id: 'studio',
            path: 'studio',
            element: (
              <LazyLoad>
                <StudioPage />
              </LazyLoad>
            ),
            handle: {
              meta: {
                title: '工作室',
                requiresAuth: true,
                icon: Computer,
              },
            },
          },
          {
            id: 'knowledge-base',
            path: 'knowledge-base',
            element: (
              <LazyLoad>
                <KnowledgeBasePage />
              </LazyLoad>
            ),
            handle: {
              meta: {
                title: '知识库',
                requiresAuth: true,
                icon: BookMarked,
              },
            },
          },
          {
            id: 'models',
            path: 'models',
            element: (
              <LazyLoad>
                <ModelsPage />
              </LazyLoad>
            ),
            handle: {
              meta: {
                title: '模型',
                requiresAuth: true,
                icon: ToolCase,
              },
            },
          },
          {
            id: 'plugin',
            path: 'plugin',
            element: (
              <LazyLoad>
                <PluginPage />
              </LazyLoad>
            ),
            handle: {
              meta: {
                title: '插件',
                requiresAuth: true,
                icon: ToyBrick,
              },
            },
          },
        ],
      },
      {
        id: 'plugin-detail',
        path: 'plugin/:pluginId',
        element: (
          <LazyLoad>
            <PluginDetailPage />
          </LazyLoad>
        ),
        handle: {
          meta: {
            title: '插件详情',
            requiresAuth: true,
          },
        },
      },
      {
        id: 'knowledge-base-detail',
        path: 'knowledge-base/:id',
        element: (
          <LazyLoad>
            <KnowledgeBaseDetailPage />
          </LazyLoad>
        ),
        handle: {
          meta: {
            title: '知识库',
            requiresAuth: true,
          },
        },
        children: [
          {
            id: 'knowledge-base-detail-index',
            index: true,
            element: <Navigate to="documents" replace />,
            handle: {
              meta: {
                title: '知识库',
                requiresAuth: true,
              },
            },
          },
          {
            id: 'knowledge-base-documents',
            path: 'documents',
            element: (
              <LazyLoad>
                <KnowledgeBaseDocumentsPage />
              </LazyLoad>
            ),
            handle: {
              meta: {
                title: '文档',
                requiresAuth: true,
                icon: FileText,
              },
            },
          },
          {
            id: 'knowledge-base-recall-test',
            path: 'recall-test',
            element: (
              <LazyLoad>
                <KnowledgeBaseRecallTestPage />
              </LazyLoad>
            ),
            handle: {
              meta: {
                title: '召回测试',
                requiresAuth: true,
                icon: Target,
              },
            },
          },
        ],
      },
      {
        id: 'app',
        path: 'app/:id',
        element: (
          <LazyLoad>
            <AppPage />
          </LazyLoad>
        ),
        handle: {
          meta: {
            title: '应用',
            requiresAuth: true,
          },
        },
        children: [
          {
            id: 'app-index',
            index: true,
            element: <Navigate to="workflow" replace />,
            handle: {
              meta: {
                title: '应用',
                requiresAuth: true,
              },
            },
          },
          {
            id: 'app-workflow',
            path: 'workflow',
            element: (
              <LazyLoad>
                <AppWorkflowPage />
              </LazyLoad>
            ),
            handle: {
              meta: {
                title: '工作流',
                requiresAuth: true,
                icon: SquareMousePointer,
              },
            },
          },
          {
            id: 'app-api',
            path: 'api',
            element: (
              <LazyLoad>
                <AppApiPage />
              </LazyLoad>
            ),
            handle: {
              meta: {
                title: '访问 API',
                requiresAuth: true,
                icon: SquareTerminal,
              },
            },
          },
          {
            id: 'app-logs',
            path: 'logs',
            element: (
              <LazyLoad>
                <AppLogsPage />
              </LazyLoad>
            ),
            handle: {
              meta: {
                title: '日志',
                requiresAuth: true,
                icon: ScrollText,
              },
            },
          },
        ],
      },
    ],
  },
  {
    id: 'docs',
    path: '/docs',
    element: (
      <LazyLoad>
        <DocsPage />
      </LazyLoad>
    ),
    handle: {
      meta: {
        title: '文档',
        requiresAuth: false,
      },
    },
    children: [
      {
        id: 'docs-index',
        index: true,
        element: <Navigate to="/docs/ai-workflow" replace />,
        handle: {
          meta: {
            title: '文档',
            requiresAuth: false,
          },
        },
      },
      {
        id: 'docs-ai-workflow',
        path: 'ai-workflow',
        handle: {
          meta: {
            title: 'AI Workflow',
            requiresAuth: false,
          },
        },
        children: [
          {
            id: 'docs-ai-workflow-overview',
            index: true,
            element: (
              <LazyLoad>
                <DocsOverviewPage />
              </LazyLoad>
            ),
            handle: {
              meta: {
                title: '概览',
                requiresAuth: false,
                icon: BookOpenText,
                navigationGroup: '开始',
              },
            },
          },
          {
            id: 'docs-ai-workflow-getting-started',
            path: 'getting-started',
            element: (
              <LazyLoad>
                <DocsGettingStartedPage />
              </LazyLoad>
            ),
            handle: {
              meta: {
                title: '快速开始',
                requiresAuth: false,
                icon: Rocket,
                navigationGroup: '开始',
              },
            },
          },
          {
            id: 'docs-ai-workflow-workflow-basics',
            path: 'workflow-basics',
            element: (
              <LazyLoad>
                <DocsWorkflowBasicsPage />
              </LazyLoad>
            ),
            handle: {
              meta: {
                title: '工作流基础',
                requiresAuth: false,
                icon: Workflow,
                navigationGroup: '核心概念',
              },
            },
          },
          {
            id: 'docs-ai-workflow-deployment',
            path: 'deployment',
            element: (
              <LazyLoad>
                <DocsDeploymentPage />
              </LazyLoad>
            ),
            handle: {
              meta: {
                title: '部署指南',
                requiresAuth: false,
                icon: ServerCog,
                navigationGroup: '运维',
              },
            },
          },
          {
            id: 'docs-ai-workflow-fallback',
            path: '*',
            element: <Navigate to="/docs/ai-workflow" replace />,
            handle: {
              meta: {
                title: 'AI Workflow',
                requiresAuth: false,
              },
            },
          },
        ],
      },
      {
        id: 'docs-project',
        path: 'project',
        handle: {
          meta: {
            title: '项目介绍',
            requiresAuth: false,
          },
        },
        children: [
          {
            id: 'docs-project-overview',
            index: true,
            element: (
              <LazyLoad>
                <DocsProjectOverviewPage />
              </LazyLoad>
            ),
            handle: {
              meta: {
                title: '项目介绍',
                requiresAuth: false,
                icon: BookOpenText,
                navigationGroup: '项目',
              },
            },
          },
          {
            id: 'docs-project-highlights',
            path: 'highlights',
            element: (
              <LazyLoad>
                <DocsProjectHighlightsPage />
              </LazyLoad>
            ),
            handle: {
              meta: {
                title: '技术亮点',
                requiresAuth: false,
                icon: Lightbulb,
                navigationGroup: '项目',
              },
            },
          },
          {
            id: 'docs-project-resume',
            path: 'resume',
            element: (
              <LazyLoad>
                <DocsProjectResumePage />
              </LazyLoad>
            ),
            handle: {
              meta: {
                title: '简历表达',
                requiresAuth: false,
                icon: Sparkles,
                navigationGroup: '面试',
              },
            },
          },
          {
            id: 'docs-project-fallback',
            path: '*',
            element: <Navigate to="/docs/project" replace />,
            handle: {
              meta: {
                title: '项目介绍',
                requiresAuth: false,
              },
            },
          },
        ],
      },
      {
        id: 'docs-plugin',
        path: 'plugin',
        handle: {
          meta: {
            title: '插件开发',
            requiresAuth: false,
          },
        },
        children: [
          {
            id: 'docs-plugin-overview',
            index: true,
            element: (
              <LazyLoad>
                <DocsPluginOverviewPage />
              </LazyLoad>
            ),
            handle: {
              meta: {
                title: '插件概览',
                requiresAuth: false,
                icon: PackageOpen,
                navigationGroup: '开始',
              },
            },
          },
          {
            id: 'docs-plugin-getting-started',
            path: 'getting-started',
            element: (
              <LazyLoad>
                <DocsPluginGettingStartedPage />
              </LazyLoad>
            ),
            handle: {
              meta: {
                title: '快速开始',
                requiresAuth: false,
                icon: Download,
                navigationGroup: '开始',
              },
            },
          },
          {
            id: 'docs-plugin-development',
            path: 'development',
            element: (
              <LazyLoad>
                <DocsPluginDevelopmentPage />
              </LazyLoad>
            ),
            handle: {
              meta: {
                title: '开发与发布',
                requiresAuth: false,
                icon: Code2,
                navigationGroup: '开发',
              },
            },
          },
          {
            id: 'docs-plugin-fallback',
            path: '*',
            element: <Navigate to="/docs/plugin" replace />,
            handle: {
              meta: {
                title: '插件开发',
                requiresAuth: false,
              },
            },
          },
        ],
      },
      {
        id: 'docs-legacy-getting-started',
        path: 'getting-started',
        element: <Navigate to="/docs/ai-workflow/getting-started" replace />,
        handle: {
          meta: {
            title: '快速开始',
            requiresAuth: false,
          },
        },
      },
      {
        id: 'docs-legacy-workflow-basics',
        path: 'workflow-basics',
        element: <Navigate to="/docs/ai-workflow/workflow-basics" replace />,
        handle: {
          meta: {
            title: '工作流基础',
            requiresAuth: false,
          },
        },
      },
      {
        id: 'docs-fallback',
        path: '*',
        element: <Navigate to="/docs" replace />,
        handle: {
          meta: {
            title: '文档',
            requiresAuth: false,
          },
        },
      },
    ],
  },
  {
    id: 'shared-app-api',
    path: '/share/api/:shareToken',
    element: (
      <LazyLoad>
        <SharedAppApiPage />
      </LazyLoad>
    ),
    handle: {
      meta: {
        title: 'API 文档',
        requiresAuth: false,
      },
    },
  },
  {
    id: 'auth',
    path: '/auth',
    element: (
      <LazyLoad>
        <AuthPage />
      </LazyLoad>
    ),
    handle: {
      meta: {
        title: '登录',
        requiresAuth: false,
      },
    },
  },
] satisfies RouteObject[]

const router = createBrowserRouter(routes)

export default router
