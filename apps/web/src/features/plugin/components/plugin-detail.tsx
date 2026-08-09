import { Button } from '@ai-workflow/ui/components/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
} from '@ai-workflow/ui/components/select'
import { showToast } from '@ai-workflow/ui/lib/toast'
import { Download } from 'lucide-react'
import { useState } from 'react'

import {
  updatePluginInstallation,
  type InstalledPluginDto,
  type UninstalledPluginDto,
} from '@/api/plugins'
import { formatPluginInstallCount } from '../data'
import type { PluginDetail as PluginDetailData, PluginVersion } from '../types'
import { PluginIcon } from './plugin-icon'
import { PluginInstallationDialog } from './plugin-installation-dialog'
import { PluginMarkdown } from './plugin-markdown'
import { PluginUninstallationDialog } from './plugin-uninstallation-dialog'
import {
  formatPluginVersionDate,
  PluginVersionHistoryDialog,
} from './plugin-version-history-dialog'

interface PluginDetailProps {
  plugin: PluginDetailData
  onInstalled: (result: InstalledPluginDto) => void
  onUninstalled: (result: UninstalledPluginDto) => void
}

export function PluginDetail({ plugin, onInstalled, onUninstalled }: PluginDetailProps) {
  const [installationOpen, setInstallationOpen] = useState(false)
  const [installationVersion, setInstallationVersion] = useState<PluginVersion>()
  const [installationChanging, setInstallationChanging] = useState(false)
  const [uninstallationOpen, setUninstallationOpen] = useState(false)
  const [versionHistoryOpen, setVersionHistoryOpen] = useState(false)
  const latestVersion = plugin.versions[0]
  const installedLatest = plugin.installation !== null && !plugin.updateAvailable
  const actionLabel = installedLatest ? '已安装' : plugin.updateAvailable ? '更新' : '安装'

  function openInstallation(version?: PluginVersion) {
    setInstallationVersion(version)
    setInstallationOpen(true)
  }

  function handleInstallVersion(version: PluginVersion) {
    setVersionHistoryOpen(false)
    openInstallation(version)
  }

  async function handleInstallationAction(action: string) {
    if (action === 'uninstall') {
      setUninstallationOpen(true)
      return
    }
    if (action !== 'enable' && action !== 'disable') return

    setInstallationChanging(true)
    try {
      const enabled = action === 'enable'
      const result = await updatePluginInstallation(plugin.id, enabled)
      onInstalled(result)
      showToast('success', enabled ? '插件已启用' : '插件已禁用')
    } catch {
      // 请求错误由统一 API 拦截器提示。
    } finally {
      setInstallationChanging(false)
    }
  }

  return (
    <>
      <section className="bg-input border-border border-b">
        <div className="mx-auto flex max-w-5xl flex-col gap-8 px-8 py-12 lg:flex-row lg:items-center">
          <div className="flex min-w-0 flex-1 items-center gap-4">
            <span className="border-border bg-background text-foreground flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl border-[0.5px]">
              <PluginIcon pluginId={plugin.id} versionId={latestVersion.id} icon={plugin.icon} />
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
                <span>{plugin.packageName ?? plugin.id}</span>
                <span aria-hidden className="bg-border mx-3 h-3 w-px" />
                <Download aria-hidden className="size-3.5 shrink-0" />
                <span className="ml-1 text-xs">
                  {formatPluginInstallCount(plugin.installCount)} 次安装
                </span>
              </div>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2 lg:pl-8">
            <div className="bg-primary flex h-9 shrink-0 items-stretch overflow-hidden rounded-lg shadow-xs">
              {installedLatest ? (
                <span className="text-primary-foreground flex h-full w-33.75 items-center justify-center px-3 text-sm font-semibold">
                  {plugin.installation?.enabled ? '已安装' : '已禁用'}
                </span>
              ) : (
                <Button
                  type="button"
                  className="h-full w-33.75 rounded-none px-3 font-semibold shadow-none"
                  onClick={() => openInstallation()}
                >
                  {actionLabel}
                </Button>
              )}
              {plugin.installation ? (
                <Select
                  value=""
                  disabled={installationChanging}
                  onValueChange={handleInstallationAction}
                >
                  <SelectTrigger
                    aria-label="管理插件安装状态"
                    aria-busy={installationChanging}
                    className="bg-primary hover:bg-primary/85 focus-visible:bg-primary/85 border-primary-foreground/15 text-primary-foreground [&>svg]:text-primary-foreground !h-full !w-9 justify-center gap-0 rounded-none border-y-0 border-r-0 border-l !p-0 shadow-none"
                  >
                    <span className="sr-only">管理插件安装状态</span>
                  </SelectTrigger>
                  <SelectContent position="popper" align="end" sideOffset={4}>
                    <SelectItem value={plugin.installation.enabled ? 'disable' : 'enable'}>
                      {plugin.installation.enabled ? '禁用插件' : '启用插件'}
                    </SelectItem>
                    <SelectSeparator />
                    <SelectItem value="uninstall" className="text-destructive">
                      卸载插件
                    </SelectItem>
                  </SelectContent>
                </Select>
              ) : null}
            </div>
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
              <span>{latestVersion.author}</span>
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
        onInstallVersion={handleInstallVersion}
      />
      <PluginInstallationDialog
        plugin={plugin}
        open={installationOpen}
        onOpenChange={(open) => {
          setInstallationOpen(open)
          if (!open) setInstallationVersion(undefined)
        }}
        onInstalled={onInstalled}
        version={installationVersion}
      />
      <PluginUninstallationDialog
        plugin={plugin}
        open={uninstallationOpen}
        onOpenChange={setUninstallationOpen}
        onUninstalled={onUninstalled}
      />
    </>
  )
}
