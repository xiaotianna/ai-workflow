import { Navigate, Outlet } from 'react-router-dom'

import { hasAuthSession } from '@/features/auth'

export default function App() {
  if (!hasAuthSession()) {
    return <Navigate to="/auth" replace />
  }

  return <Outlet />
}
