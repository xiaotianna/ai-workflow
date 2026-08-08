import { Button } from '@ai-workflow/ui/components/button'
import { useEffect, useRef } from 'react'

import { PluginCard } from './plugin-card'
import { PluginCardSkeletonGrid } from './plugin-card-skeleton'
import type { PluginListItem } from '../types'

interface PluginGridProps {
  plugins: PluginListItem[]
  hasMore: boolean
  initialError: boolean
  initialLoading: boolean
  loadMoreError: boolean
  loadingMore: boolean
  onLoadMore: () => void
  onRetryInitial: () => void
  onRetryLoadMore: () => void
}

const pluginGridClassName =
  '2k:grid-cols-6 relative grid grow grid-cols-1 content-start gap-2.5 pt-4 sm:grid-cols-1 md:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-5'

export function PluginGrid({
  plugins,
  hasMore,
  initialError,
  initialLoading,
  loadMoreError,
  loadingMore,
  onLoadMore,
  onRetryInitial,
  onRetryLoadMore,
}: PluginGridProps) {
  const loadMoreSentinelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const sentinel = loadMoreSentinelRef.current
    if (!sentinel || !hasMore || loadingMore || loadMoreError) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) onLoadMore()
      },
      { rootMargin: '240px 0px' },
    )

    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [hasMore, loadMoreError, loadingMore, onLoadMore])

  if (initialLoading) {
    return (
      <div className={pluginGridClassName} role="status" aria-label="正在加载插件">
        <PluginCardSkeletonGrid count={8} />
      </div>
    )
  }

  if (initialError) {
    return (
      <div className="flex min-h-48 flex-col items-center justify-center gap-3">
        <p className="text-muted-foreground text-sm">插件加载失败</p>
        <Button type="button" variant="secondary" size="sm" onClick={onRetryInitial}>
          重新加载
        </Button>
      </div>
    )
  }

  if (plugins.length === 0) {
    return (
      <div className="text-muted-foreground flex min-h-48 items-center justify-center text-sm">
        暂无匹配的插件
      </div>
    )
  }

  return (
    <>
      <div className={pluginGridClassName}>
        {plugins.map((plugin) => (
          <PluginCard key={plugin.id} plugin={plugin} />
        ))}
        {loadingMore ? <PluginCardSkeletonGrid count={4} /> : null}
      </div>

      {loadMoreError ? (
        <div className="flex h-16 items-center justify-center">
          <Button type="button" variant="secondary" size="sm" onClick={onRetryLoadMore}>
            加载失败，点击重试
          </Button>
        </div>
      ) : hasMore ? (
        <div ref={loadMoreSentinelRef} aria-hidden className="h-1" />
      ) : (
        <p className="text-muted-foreground py-6 text-center text-xs">没有更多插件了</p>
      )}
    </>
  )
}
