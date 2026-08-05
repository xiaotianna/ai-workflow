import { AppApiDocs } from '@/features/app-api'
import { useOutletContext, useParams } from 'react-router-dom'

import type { AppDetailOutletContext } from './index'

export default function AppApiPage() {
  const { id } = useParams<{ id: string }>()
  const { isResourceAvailable } = useOutletContext<AppDetailOutletContext>()

  return <AppApiDocs appId={id} isResourceAvailable={isResourceAvailable} />
}
