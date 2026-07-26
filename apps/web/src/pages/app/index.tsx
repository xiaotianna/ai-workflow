import { useParams } from 'react-router-dom'

import { DetailLayout } from '@/components/detail-layout'
import {
  AppDetailIdentity,
  initialStudioApps,
  type StudioAppActionHandler,
  type StudioAppListItem,
} from '@/features/studio'
import { routes } from '@/router'
import { getNavigationItemsFromRoute } from '@/router/navigation'

export interface AppPageProps {
  onAppAction?: StudioAppActionHandler
  onImportDsl?: (file: File, app: StudioAppListItem) => void
}

export default function AppPage({ onAppAction, onImportDsl }: AppPageProps) {
  const { id } = useParams<{ id: string }>()
  const app = initialStudioApps.find((item) => item.id === id)
  const encodedAppId = encodeURIComponent(id ?? '')

  return (
    <DetailLayout
      backTo="/studio"
      backLabel="工作室"
      resourceIdentity={
        <AppDetailIdentity app={app} onAppAction={onAppAction} onImportDsl={onImportDsl} />
      }
      navigationItems={getNavigationItemsFromRoute(routes, 'app', `/app/${encodedAppId}`)}
      navigationLabel="应用导航"
    />
  )
}
