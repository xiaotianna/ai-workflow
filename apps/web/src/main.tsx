import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import { Toaster } from '@ai-workflow/ui/components/sonner'

import { configureApiClient } from '@/api/client'
import { clearAuthSession, getAuthToken } from '@/features/auth'
import { installPluginSharedModuleScope } from '@/features/workflow/plugin-runtime/install-plugin-shared-scope'

import './index.css'
import router from './router'

installPluginSharedModuleScope()

configureApiClient({
  getAccessToken: getAuthToken,
  onUnauthorized: () => {
    clearAuthSession()
    void router.navigate('/auth', { replace: true })
  },
})

createRoot(document.getElementById('root')!).render(
  <>
    <RouterProvider router={router} />
    <Toaster />
  </>,
)
