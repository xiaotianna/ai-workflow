import { Button } from '@ai-workflow/ui/components/button'

import { PluginCard } from './plugin-card'
import { PluginCardSkeletonGrid } from './plugin-card-skeleton'
import type { PluginListItem } from '../types'

interface PluginGridProps {
  plugins: PluginListItem[]
  error: boolean
  loading: boolean
  onRetry: () => void
}

const pluginGridClassName =
  '2k:grid-cols-6 relative grid grow grid-cols-1 content-start gap-2.5 pt-4 sm:grid-cols-1 md:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-5'

export function PluginGrid({ plugins, error, loading, onRetry }: PluginGridProps) {
  if (loading) {
    return (
      <div className={pluginGridClassName} role="status" aria-label="正在加载插件">
        <PluginCardSkeletonGrid count={8} />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex min-h-48 flex-col items-center justify-center gap-3">
        <p className="text-muted-foreground text-sm">插件加载失败</p>
        <Button type="button" variant="secondary" size="sm" onClick={onRetry}>
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
    <div className={pluginGridClassName}>
      {plugins.map((plugin) => (
        <PluginCard key={plugin.id} plugin={plugin} />
      ))}
    </div>
  )
}
