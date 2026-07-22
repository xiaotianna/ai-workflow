import { Outlet } from 'react-router-dom'
import { LayoutSidebar } from '@/components/layout-sidebar'

const username = 'AI Workflow'

export default function LayoutPage() {
  return (
    <div className="bg-muted/35 flex min-h-svh">
      <LayoutSidebar username={username} />

      <main className="min-h-svh min-w-0 flex-1 overflow-auto px-8 py-6">
        <Outlet />
      </main>
    </div>
  )
}
