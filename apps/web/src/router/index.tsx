import { lazy } from 'react'
import {
  BookMarked,
  Computer,
  FileText,
  Target,
  ScrollText,
  SquareMousePointer,
  SquareTerminal,
  ToolCase,
} from 'lucide-react'
import { createBrowserRouter, Navigate, type RouteObject } from 'react-router-dom'

import App from '../App'
import LazyLoad from '../components/lazy-load'

const AuthPage = lazy(() => import('../pages/auth'))
const LayoutPage = lazy(() => import('../pages/home-layout'))
const KnowledgeBasePage = lazy(() => import('../pages/home-layout/knowledge-base'))
const PluginPage = lazy(() => import('../pages/home-layout/plugin'))
const StudioPage = lazy(() => import('../pages/home-layout/studio'))
const AppPage = lazy(() => import('../pages/app'))
const AppWorkflowPage = lazy(() => import('../pages/app/workflow'))
const AppApiPage = lazy(() => import('../pages/app/api'))
const AppLogsPage = lazy(() => import('../pages/app/logs'))
const KnowledgeBaseDetailPage = lazy(() => import('../pages/knowledge-base'))
const KnowledgeBaseDocumentsPage = lazy(() => import('../pages/knowledge-base/documents'))
const KnowledgeBaseRecallTestPage = lazy(() => import('../pages/knowledge-base/recall-test'))

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
                icon: ToolCase,
              },
            },
          },
        ],
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
