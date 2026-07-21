import { lazy } from 'react'
import { createBrowserRouter, Navigate, type RouteObject } from 'react-router-dom'

import App from '../App'
import LazyLoad from '../components/lazy-load'

const AuthPage = lazy(() => import('../pages/auth'))
const LayoutPage = lazy(() => import('../pages/layout'))
const KnowledgeBasePage = lazy(() => import('../pages/layout/knowledge-base'))
const PluginPage = lazy(() => import('../pages/layout/plugin'))
const StudioPage = lazy(() => import('../pages/layout/studio'))

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
                title: '工作流',
                requiresAuth: true,
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
