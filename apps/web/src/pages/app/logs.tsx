import { PageContent } from '@/components/page-content'
import { PageTitle } from '@/components/page-title'
import { AppLogs } from '@/features/app-logs'
import { useOutletContext } from 'react-router-dom'

import type { AppDetailOutletContext } from '.'

export default function AppLogsPage() {
  const { app, isResourceAvailable } = useOutletContext<AppDetailOutletContext>()

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden px-6 pt-4 pb-6">
      <PageTitle title="日志" subtitle="记录已发布工作流应用的调用情况" />

      <PageContent className="mt-5 min-w-0 overflow-auto">
        {app && isResourceAvailable ? (
          <AppLogs key={app.id} appId={app.id} />
        ) : (
          <div className="text-muted-foreground flex min-h-48 items-center justify-center text-sm">
            应用不可用或正在加载
          </div>
        )}
      </PageContent>
    </div>
  )
}
