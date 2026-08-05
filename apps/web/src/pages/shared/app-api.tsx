import { getPublicAppApiDocs, type PublicAppApiDocsDto } from '@/api/app-api'
import { AppApiReference } from '@/features/app-api'
import { LoaderCircle } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'

export default function SharedAppApiPage() {
  const { shareToken } = useParams<{ shareToken: string }>()
  const [sharedApp, setSharedApp] = useState<PublicAppApiDocsDto>()
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    if (!shareToken) {
      setLoading(false)
      setFailed(true)
      return
    }

    const controller = new AbortController()
    setLoading(true)
    setFailed(false)
    void getPublicAppApiDocs(shareToken, controller.signal)
      .then(setSharedApp)
      .catch(() => {
        if (!controller.signal.aborted) {
          setSharedApp(undefined)
          setFailed(true)
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })
    return () => controller.abort()
  }, [shareToken])

  if (loading) {
    return (
      <main className="bg-background text-muted-foreground flex min-h-svh items-center justify-center">
        <span role="status" className="inline-flex items-center gap-2 text-sm">
          <LoaderCircle
            aria-hidden
            className="text-primary size-4 animate-spin motion-reduce:animate-none"
          />
          正在加载 API 文档
        </span>
      </main>
    )
  }

  if (failed || !sharedApp) {
    return (
      <main className="bg-background flex min-h-svh items-center justify-center px-6 text-center">
        <div>
          <h1 className="text-foreground text-lg font-semibold">分享链接不可用</h1>
          <p className="text-muted-foreground mt-2 text-sm">链接不存在或分享已被关闭。</p>
        </div>
      </main>
    )
  }

  return (
    <main className="bg-background min-h-svh py-8">
      <AppApiReference contract={sharedApp} />
    </main>
  )
}
