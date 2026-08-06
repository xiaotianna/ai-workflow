import { Button } from '@ai-workflow/ui/components/button'
import { ChevronDown, Download } from 'lucide-react'
import { useState } from 'react'

import { formatPluginInstallCount } from '../data'
import type { PluginDetail as PluginDetailData } from '../types'
import { PluginMarkdown } from './plugin-markdown'
import {
  formatPluginVersionDate,
  PluginVersionHistoryDialog,
} from './plugin-version-history-dialog'

interface PluginDetailProps {
  plugin: PluginDetailData
}

export function PluginDetail({ plugin }: PluginDetailProps) {
  const [versionHistoryOpen, setVersionHistoryOpen] = useState(false)
  const Icon = plugin.icon
  const latestVersion = plugin.versions[0]

  return (
    <>
      <section className="bg-input border-border border-b">
        <div className="mx-auto flex max-w-5xl flex-col gap-8 px-8 py-12 lg:flex-row lg:items-center">
          <div className="flex min-w-0 flex-1 items-center gap-4">
            <span className="border-border bg-background text-foreground flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl border-[0.5px]">
              <Icon aria-hidden className="size-10" />
            </span>

            <div className="flex min-w-0 grow flex-col justify-start">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <div className="flex min-w-0 items-center gap-x-1">
                  <h1 className="text-foreground truncate text-2xl leading-8 font-semibold tracking-tight">
                    {plugin.title}
                  </h1>
                  {plugin.verified ? (
                    <img
                      src="/plugin-badge.svg"
                      alt="已认证发布者"
                      aria-label="已认证发布者"
                      className="text-primary size-5 shrink-0"
                    />
                  ) : null}
                </div>
                <span className="border-border text-muted-foreground flex h-6 items-center rounded-md border px-2 text-xs font-medium">
                  {latestVersion.version}
                </span>
              </div>
              <p className="text-foreground/80 line-clamp-3 max-w-3xl pt-1 text-sm leading-5">
                {plugin.description}
              </p>
              <div className="text-muted-foreground flex flex-wrap items-center pt-2 text-[13px] leading-4">
                <span>{plugin.author}</span>
                <span aria-hidden className="mx-1">
                  /
                </span>
                <span>{plugin.slug ?? plugin.id}</span>
                <span aria-hidden className="bg-border mx-3 h-3 w-px" />
                <Download aria-hidden className="size-3.5 shrink-0" />
                <span className="ml-1 text-xs">
                  {formatPluginInstallCount(plugin.installCount)} 次安装
                </span>
              </div>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2 lg:pl-8">
            <div className="flex shrink-0 overflow-hidden rounded-lg">
              <Button
                type="button"
                className="h-9 w-33.75 rounded-none rounded-l-lg px-3 font-semibold"
              >
                安装
              </Button>
              <Button
                type="button"
                size="icon"
                className="border-primary-foreground/15 h-9 rounded-none rounded-r-lg border-l"
                aria-label="更多安装选项"
              >
                <ChevronDown aria-hidden className="size-4" />
              </Button>
            </div>
            <Button type="button" variant="secondary" size="icon" aria-label="下载插件">
              <Download aria-hidden />
            </Button>
          </div>
        </div>
      </section>

      <div className="bg-background">
        <div className="mx-auto grid max-w-5xl gap-12 px-8 py-10 lg:grid-cols-[minmax(0,1fr)_280px]">
          <article className="min-w-0">
            <PluginMarkdown>{plugin.content}</PluginMarkdown>
          </article>

          <aside className="self-start lg:sticky lg:top-24" aria-label="插件版本信息">
            <h2 className="text-foreground text-sm font-semibold">版本</h2>
            <div className="text-muted-foreground mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
              <span className="text-foreground font-medium">v{latestVersion.version}</span>
              <span aria-hidden className="bg-border h-3.5 w-px" />
              <span>{latestVersion.publisher}</span>
            </div>
            <time
              dateTime={latestVersion.publishedAt}
              className="text-muted-foreground mt-1 block text-xs tabular-nums"
            >
              {formatPluginVersionDate(latestVersion.publishedAt)}
            </time>
            <Button
              type="button"
              variant="link"
              className="mt-2 h-auto justify-start px-0 text-[13px]"
              onClick={() => setVersionHistoryOpen(true)}
            >
              版本历史
            </Button>
          </aside>
        </div>
      </div>

      <PluginVersionHistoryDialog
        plugin={plugin}
        open={versionHistoryOpen}
        onOpenChange={setVersionHistoryOpen}
      />
    </>
  )
}
