import { Button } from '@ai-workflow/ui/components/button'
import { useVirtualizer } from '@tanstack/react-virtual'
import { useEffect, useRef, useState } from 'react'

import {
  ResourceCardSkeleton,
  ResourceCardSkeletonGrid,
} from '@/components/card/resource-card-skeleton'
import { ResourceCard } from '@/components/card/resource-card'

import { getStudioAppTimeDisplay } from '../studio-app-sort-strategies'
import type { StudioAppActionHandler, StudioAppListItem, StudioAppSort } from '../types'
import { getStudioAppActions } from './studio-app-actions'

interface StudioAppGridProps {
  apps: StudioAppListItem[]
  hasMore: boolean
  initialError: boolean
  initialLoading: boolean
  loadMoreError: boolean
  loadingMore: boolean
  sort: StudioAppSort
  onLoadMore: () => void
  onRetryInitial: () => void
  onRetryLoadMore: () => void
  onAppAction?: StudioAppActionHandler
}

export function StudioAppGrid({
  apps,
  hasMore,
  initialError,
  initialLoading,
  loadMoreError,
  loadingMore,
  sort,
  onLoadMore,
  onRetryInitial,
  onRetryLoadMore,
  onAppAction,
}: StudioAppGridProps) {
  const scrollElementRef = useRef<HTMLDivElement>(null)
  const [columnCount, setColumnCount] = useState(getStudioColumnCount)
  const rowCount = Math.ceil(apps.length / columnCount)
  const footerRowCount = loadingMore || loadMoreError ? 1 : 0
  const rowVirtualizer = useVirtualizer({
    count: rowCount + footerRowCount,
    getScrollElement: () => scrollElementRef.current,
    estimateSize: () => 151,
    overscan: 2,
  })
  const virtualRows = rowVirtualizer.getVirtualItems()
  const lastVirtualRowIndex = virtualRows.at(-1)?.index

  useEffect(() => {
    function handleResize() {
      setColumnCount(getStudioColumnCount())
    }

    globalThis.addEventListener('resize', handleResize)
    return () => globalThis.removeEventListener('resize', handleResize)
  }, [])

  useEffect(() => {
    rowVirtualizer.measure()
  }, [columnCount, rowVirtualizer])

  useEffect(() => {
    if (
      lastVirtualRowIndex === undefined ||
      rowCount === 0 ||
      lastVirtualRowIndex < rowCount - 1 ||
      !hasMore ||
      loadingMore ||
      loadMoreError
    ) {
      return
    }

    onLoadMore()
  }, [hasMore, lastVirtualRowIndex, loadMoreError, loadingMore, onLoadMore, rowCount])

  if (initialLoading) {
    return (
      <div className="h-full min-h-0 overflow-auto">
        <div
          className="2k:grid-cols-6 grid grid-cols-1 content-start gap-2.5 pt-4 sm:grid-cols-1 md:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-5"
          role="status"
          aria-label="正在加载工作流应用"
        >
          <ResourceCardSkeletonGrid count={6} />
        </div>
      </div>
    )
  }

  if (initialError) {
    return (
      <div className="flex min-h-48 flex-col items-center justify-center gap-3">
        <p className="text-muted-foreground text-sm">工作流应用加载失败</p>
        <Button type="button" variant="secondary" size="sm" onClick={onRetryInitial}>
          重新加载
        </Button>
      </div>
    )
  }

  if (apps.length === 0) {
    return (
      <div className="text-muted-foreground flex min-h-48 items-center justify-center text-sm">
        暂无工作流应用
      </div>
    )
  }

  return (
    <div ref={scrollElementRef} className="relative -mx-4 h-full min-h-0 overflow-auto px-4 pt-4">
      <div className="relative w-full" style={{ height: rowVirtualizer.getTotalSize() + 16 }}>
        {virtualRows.map((virtualRow) => {
          const isFooterRow = virtualRow.index >= rowCount
          const rowApps = isFooterRow
            ? []
            : apps.slice(virtualRow.index * columnCount, (virtualRow.index + 1) * columnCount)

          return (
            <div
              key={virtualRow.key}
              ref={rowVirtualizer.measureElement}
              data-index={virtualRow.index}
              className="2k:grid-cols-6 absolute top-0 left-0 z-0 grid w-full grid-cols-1 gap-2.5 pb-2.5 focus-within:z-10 hover:z-10 sm:grid-cols-1 md:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-5"
              style={{ transform: `translateY(${virtualRow.start}px)` }}
            >
              {isFooterRow ? (
                loadMoreError ? (
                  <div className="col-span-full flex h-14 items-center justify-center">
                    <Button type="button" variant="secondary" size="sm" onClick={onRetryLoadMore}>
                      加载失败，点击重试
                    </Button>
                  </div>
                ) : (
                  Array.from({ length: columnCount }, (_, index) => (
                    <ResourceCardSkeleton key={index} />
                  ))
                )
              ) : (
                rowApps.map((app) => {
                  const actions = getStudioAppActions(app, onAppAction)
                  const timeDisplay = getStudioAppTimeDisplay(app, sort)

                  return (
                    <ResourceCard
                      key={app.id}
                      title={app.title}
                      kindLabel="工作流"
                      author={app.author}
                      timeLabel={timeDisplay.label}
                      timeValue={timeDisplay.value}
                      description={app.description}
                      icon={app.icon}
                      to={`/app/${encodeURIComponent(app.id)}/workflow`}
                      linkAriaLabel={`打开应用 ${app.title}`}
                      actions={actions}
                      className="z-0 focus-within:z-10 hover:z-10"
                    />
                  )
                })
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function getStudioColumnCount(): number {
  const width = globalThis.innerWidth

  if (width >= 2560) return 6
  if (width >= 1536) return 5
  if (width >= 1280) return 4
  if (width >= 768) return 2
  return 1
}
