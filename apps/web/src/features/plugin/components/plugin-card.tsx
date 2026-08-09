import { Button } from '@ai-workflow/ui/components/button'
import { cn } from '@ai-workflow/ui/lib/utils'
import { ExternalLink, LockKeyhole, Tag } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'

import type { InstalledPluginDto } from '@/api/plugins'
import { formatPluginInstallCount } from '../data'
import { getPluginDetailPath } from '../paths'
import type { PluginListItem } from '../types'
import { PluginIcon } from './plugin-icon'
import { PluginInstallationDialog } from './plugin-installation-dialog'

export interface PluginCardProps {
  plugin: PluginListItem
  className?: string
  onInstalled: (result: InstalledPluginDto) => void
}

export function PluginCard({ plugin, className, onInstalled }: PluginCardProps) {
  const [installationOpen, setInstallationOpen] = useState(false)
  const detailPath = getPluginDetailPath(plugin)
  const installedLatest = plugin.installation !== null && !plugin.updateAvailable
  const actionLabel = installedLatest ? '已安装' : plugin.updateAvailable ? '更新' : '安装'

  return (
    <>
      <article
        className={cn(
          'group bg-card hover:bg-input/60 focus-within:bg-input/60 border-border/20 relative flex min-h-[176px] w-full cursor-pointer flex-col overflow-hidden rounded-xl border shadow-xs transition-[background-color,box-shadow] duration-200 focus-within:shadow-md hover:shadow-md',
          className,
        )}
      >
        <Link
          to={detailPath}
          aria-label={`查看 ${plugin.title} 插件详情`}
          className="absolute inset-0 z-10 outline-none"
        />

        <div className="flex shrink-0 items-start gap-3 px-4 pt-4 pb-2">
          <span className="border-border/80 bg-background text-foreground flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-[10px] border-[0.5px]">
            <PluginIcon
              pluginId={plugin.id}
              versionId={plugin.latestVersion.id}
              icon={plugin.icon}
            />
          </span>

          <div className="min-w-0 flex-1">
            <h2 className="text-foreground truncate text-sm leading-5 font-semibold">
              {plugin.title}
            </h2>
            <p className="text-muted-foreground mt-0.5 truncate text-xs leading-4">
              作者 {plugin.author} · {formatPluginInstallCount(plugin.installCount)} 次安装
            </p>
          </div>
        </div>

        <div className="relative min-h-10 flex-1 px-4 pb-2">
          <p className="text-muted-foreground line-clamp-2 text-[13px] leading-5 transition-opacity duration-200 group-focus-within:opacity-0 group-hover:opacity-0 motion-reduce:transition-none">
            {plugin.description}
          </p>
          <p
            aria-hidden
            className="text-muted-foreground absolute inset-x-4 top-0 line-clamp-2 [mask-image:linear-gradient(to_bottom,black_58%,transparent_100%)] text-[13px] leading-5 opacity-0 transition-opacity duration-200 group-focus-within:opacity-100 group-hover:opacity-100 motion-reduce:transition-none"
          >
            {plugin.description}
          </p>
        </div>

        <div className="relative min-h-10 shrink-0 px-4 pt-1 pb-4">
          <div className="flex flex-wrap items-center gap-1.5 transition-opacity duration-200 group-hover:pointer-events-none group-hover:opacity-0">
            <span className="border-border/60 text-muted-foreground inline-flex h-6 items-center rounded-md border px-2 text-[11px] leading-4 font-medium">
              v{plugin.latestVersion.version}
            </span>
            {plugin.visibility === 'PRIVATE' ? (
              <span className="border-border/60 text-muted-foreground inline-flex h-6 items-center gap-1 rounded-md border px-2 text-[11px] leading-4 font-medium">
                <LockKeyhole aria-hidden className="size-3" />
                私有
              </span>
            ) : null}
            {plugin.tags.map((tag) => (
              <span
                key={tag}
                className="border-border/60 text-muted-foreground inline-flex h-6 items-center gap-1 rounded-md border px-2 text-[11px] leading-4 font-medium tracking-wide uppercase"
              >
                <Tag aria-hidden className="size-3" />
                {tag}
              </span>
            ))}
          </div>

          <div className="pointer-events-none absolute inset-x-4 bottom-4 z-20 flex items-center gap-2 opacity-0 transition-opacity duration-200 group-focus-within:pointer-events-auto group-focus-within:opacity-100 group-hover:pointer-events-auto group-hover:opacity-100">
            {installedLatest ? (
              <span className="bg-primary text-primary-foreground flex h-8 flex-1 items-center justify-center rounded-lg px-3.5 text-[13px] leading-4 font-medium shadow-xs">
                {plugin.installation?.enabled ? '已安装' : '已禁用'}
              </span>
            ) : (
              <Button
                type="button"
                size="sm"
                className="h-8 flex-1 rounded-lg"
                onClick={() => setInstallationOpen(true)}
              >
                {actionLabel}
              </Button>
            )}
            <Button asChild variant="secondary" size="sm" className="h-8 rounded-lg px-3">
              <Link to={detailPath}>
                详情
                <ExternalLink aria-hidden className="size-3.5" />
              </Link>
            </Button>
          </div>
        </div>
      </article>

      <PluginInstallationDialog
        plugin={plugin}
        open={installationOpen}
        onOpenChange={setInstallationOpen}
        onInstalled={onInstalled}
      />
    </>
  )
}
