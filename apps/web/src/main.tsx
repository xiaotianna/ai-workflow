import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import { Toaster } from '@ai-workflow/ui/components/sonner'

import './index.css'
import router from './router'

createRoot(document.getElementById('root')!).render(
  <>
    <RouterProvider router={router} />
    <Toaster />
  </>,
)
