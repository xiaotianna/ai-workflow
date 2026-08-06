import { Button } from '@ai-workflow/ui/components/button'
import { cn } from '@ai-workflow/ui/lib/utils'
import { ExternalLink, Tag } from 'lucide-react'

import { formatPluginInstallCount } from '../data'
import type { PluginListItem } from '../types'

export interface PluginCardProps {
  plugin: PluginListItem
  className?: string
}

export function PluginCard({ plugin, className }: PluginCardProps) {
  const Icon = plugin.icon

  return (
    <article
      className={cn(
        'group bg-card hover:bg-input/60 border-border/20 relative flex min-h-[176px] w-full cursor-pointer flex-col overflow-hidden rounded-xl border shadow-xs transition-[background-color,box-shadow] duration-200 hover:shadow-md',
        className,
      )}
    >
      <span className="bg-muted text-muted-foreground absolute top-0 right-0 rounded-bl-lg px-2 py-1 text-[11px] leading-4 font-medium">
        {plugin.categoryLabel}
      </span>

      <div className="flex shrink-0 items-start gap-3 px-4 pt-4 pr-16 pb-2">
        <span className="border-border/80 bg-background text-foreground flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-[10px] border-[0.5px]">
          <Icon aria-hidden className="size-5" />
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
        <p className="text-muted-foreground line-clamp-2 [mask-image:linear-gradient(to_bottom,black_58%,transparent_100%)] text-[13px] leading-5">
          {plugin.description}
        </p>
      </div>

      <div className="relative min-h-10 shrink-0 px-4 pt-1 pb-4">
        <div className="flex flex-wrap items-center gap-1.5 transition-opacity duration-200 group-hover:pointer-events-none group-hover:opacity-0">
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

        <div className="absolute inset-x-4 bottom-4 flex items-center gap-2 opacity-0 transition-opacity duration-200 group-focus-within:opacity-100 group-hover:opacity-100">
          <Button type="button" size="sm" className="h-8 flex-1 rounded-lg">
            安装
          </Button>
          <Button type="button" variant="secondary" size="sm" className="h-8 rounded-lg px-3">
            详情
            <ExternalLink aria-hidden className="size-3.5" />
          </Button>
        </div>
      </div>
    </article>
  )
}
