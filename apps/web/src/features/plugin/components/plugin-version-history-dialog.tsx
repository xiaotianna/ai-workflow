import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@ai-workflow/ui/components/dialog'
import { Tabs, TabsContent } from '@ai-workflow/ui/components/tabs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@ai-workflow/ui/components/table'
import { cn } from '@ai-workflow/ui/lib/utils'
import { useState, type UIEvent } from 'react'

import { PanelTabsList, PanelTabsTrigger } from '@/components/panel-tabs'

import type { PluginDetail } from '../types'
import { PluginMarkdown } from './plugin-markdown'

interface PluginVersionHistoryDialogProps {
  plugin: PluginDetail
  open: boolean
  onOpenChange: (open: boolean) => void
}

const VERSION_BATCH_SIZE = 5
const VERSION_LOAD_THRESHOLD = 24
type VersionHistoryTab = 'versions' | 'changelog'

export function PluginVersionHistoryDialog({
  plugin,
  open,
  onOpenChange,
}: PluginVersionHistoryDialogProps) {
  const [activeTab, setActiveTab] = useState<VersionHistoryTab>('versions')
  const [visibleVersionCount, setVisibleVersionCount] = useState(VERSION_BATCH_SIZE)
  const latestVersion = plugin.versions[0]
  const visibleVersions = plugin.versions.slice(0, visibleVersionCount)
  const hasMoreVersions = visibleVersions.length < plugin.versions.length
  const changelog = plugin.versions
    .map((version) => `## v${version.version}\n\n${version.changelog.trim()}`)
    .join('\n\n')

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) {
      setActiveTab('versions')
      setVisibleVersionCount(VERSION_BATCH_SIZE)
    }
    onOpenChange(nextOpen)
  }

  function handleTabChange(value: string) {
    if (value === 'versions' || value === 'changelog') setActiveTab(value)
  }

  function handleVersionScroll(event: UIEvent<HTMLDivElement>) {
    if (!hasMoreVersions) return

    const { clientHeight, scrollHeight, scrollTop } = event.currentTarget
    const distanceToBottom = scrollHeight - scrollTop - clientHeight
    if (distanceToBottom > VERSION_LOAD_THRESHOLD) return

    setVisibleVersionCount((currentCount) =>
      Math.min(currentCount + VERSION_BATCH_SIZE, plugin.versions.length),
    )
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="grid max-h-[calc(100svh-2rem)] max-w-5xl grid-rows-[auto_minmax(0,1fr)] gap-0 overflow-hidden p-0">
        <DialogHeader className="px-6 pt-6 pb-4">
          <DialogTitle>版本历史</DialogTitle>
          <DialogDescription>
            查看 {plugin.title} 的已发布版本记录和对应更新内容。
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={handleTabChange} className="flex min-h-0 flex-col">
          <PanelTabsList aria-label="版本历史内容" className="px-6">
            <PanelTabsTrigger value="versions">版本</PanelTabsTrigger>
            <PanelTabsTrigger value="changelog">更新日志</PanelTabsTrigger>
          </PanelTabsList>

          <div
            className={cn(
              'min-h-0 flex-1 px-6 pt-2 pb-5',
              activeTab === 'versions' ? 'h-61' : 'h-[min(70svh,36rem)]',
            )}
          >
            <TabsContent
              value="versions"
              className="h-full overflow-auto"
              onScroll={handleVersionScroll}
            >
              <Table
                aria-label={`${plugin.title} 版本历史`}
                containerClassName="overflow-visible"
                className="min-w-155"
              >
                <TableHeader className="bg-input sticky top-0 z-10 [&_tr]:border-0">
                  <TableRow className="bg-input hover:bg-input border-0">
                    <TableHead className="w-44 rounded-l-lg">版本</TableHead>
                    <TableHead className="w-56">更新于</TableHead>
                    <TableHead className="rounded-r-lg">发布者</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visibleVersions.map((version) => (
                    <TableRow key={version.version} className="hover:bg-input/50">
                      <TableCell>
                        <span className="inline-flex items-center gap-2 font-medium">
                          v{version.version}
                          {version.version === latestVersion.version ? (
                            <span className="border-primary/40 bg-primary/5 text-primary rounded-md border px-1.5 py-0.5 text-[11px] leading-4 font-medium">
                              最新
                            </span>
                          ) : null}
                        </span>
                      </TableCell>
                      <TableCell className="text-muted-foreground tabular-nums">
                        <time dateTime={version.publishedAt}>
                          {formatPluginVersionDate(version.publishedAt)}
                        </time>
                      </TableCell>
                      <TableCell>{version.author}</TableCell>
                    </TableRow>
                  ))}
                  {hasMoreVersions ? (
                    <TableRow className="hover:bg-transparent">
                      <TableCell
                        colSpan={3}
                        role="status"
                        className="text-muted-foreground text-center"
                      >
                        向下滚动加载更多版本
                      </TableCell>
                    </TableRow>
                  ) : null}
                </TableBody>
              </Table>
            </TabsContent>

            <TabsContent value="changelog" className="h-full overflow-auto">
              <PluginMarkdown className="pb-1">{changelog}</PluginMarkdown>
            </TabsContent>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}

export function formatPluginVersionDate(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value

  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
    .format(date)
    .replaceAll('/', '-')
}
