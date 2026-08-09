import { Button } from '@ai-workflow/ui/components/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@ai-workflow/ui/components/dialog'
import { showToast } from '@ai-workflow/ui/lib/toast'
import { ShieldCheck } from 'lucide-react'
import { useState } from 'react'

import { installPlugin, type InstalledPluginDto } from '@/api/plugins'
import { pluginPermissionDetails } from '../permissions'
import type { PluginListItem, PluginVersion } from '../types'

interface PluginInstallationDialogProps {
  plugin: PluginListItem
  open: boolean
  onOpenChange: (open: boolean) => void
  onInstalled: (result: InstalledPluginDto) => void
  version?: PluginVersion
}

export function PluginInstallationDialog({
  plugin,
  open,
  onOpenChange,
  onInstalled,
  version,
}: PluginInstallationDialogProps) {
  const [installing, setInstalling] = useState(false)
  const updating = plugin.installation !== null
  const targetVersion = version ?? plugin.latestVersion
  const switchingVersion =
    plugin.installation !== null && plugin.installation.versionId !== targetVersion.id
  const updatingToLatest = plugin.updateAvailable && targetVersion.id === plugin.latestVersion.id
  const grantedPermissions = new Set(plugin.installation?.grantedPermissions)
  const permissions = targetVersion.permissions

  function handleOpenChange(nextOpen: boolean) {
    if (installing && !nextOpen) return
    onOpenChange(nextOpen)
  }

  async function handleConfirm() {
    setInstalling(true)

    try {
      const result = await installPlugin(plugin.id, {
        versionId: targetVersion.id,
        permissions,
      })
      onInstalled(result)
      showToast(
        'success',
        updatingToLatest ? '插件已更新' : switchingVersion ? '插件版本已切换' : '插件已安装',
      )
      onOpenChange(false)
    } catch {
      // 请求错误由统一 API 拦截器提示，保留弹窗供用户重试。
    } finally {
      setInstalling(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg" showCloseButton={!installing}>
        <DialogHeader>
          <DialogTitle>{`${updatingToLatest ? '更新' : '安装'} ${plugin.title} v${targetVersion.version}`}</DialogTitle>
          <DialogDescription>
            {updating
              ? `将当前安装版本从 v${plugin.installation?.version} 切换到 v${targetVersion.version}。编辑中的工作流将使用新版本，已发布和历史版本不受影响。`
              : `即将安装 v${targetVersion.version}。请确认该版本需要的权限。`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2" aria-label="插件申请的权限">
          {permissions.length > 0 ? (
            permissions.map((permission) => {
              const details = pluginPermissionDetails[permission]
              const PermissionIcon = details.icon
              const newlyRequested = updating && !grantedPermissions.has(permission)

              return (
                <div
                  key={permission}
                  className="border-border bg-input/50 flex items-start gap-3 rounded-lg border p-3"
                >
                  <span className="bg-background text-foreground flex size-9 shrink-0 items-center justify-center rounded-lg border">
                    <PermissionIcon aria-hidden className="size-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-foreground text-sm font-medium">{details.title}</p>
                      {newlyRequested ? (
                        <span className="bg-warning/10 text-warning rounded px-1.5 py-0.5 text-[11px] font-medium">
                          新增权限
                        </span>
                      ) : null}
                    </div>
                    <p className="text-muted-foreground mt-0.5 text-xs leading-5">
                      {details.description}
                    </p>
                  </div>
                </div>
              )
            })
          ) : (
            <div className="border-border bg-input/50 flex items-center gap-3 rounded-lg border p-3">
              <ShieldCheck aria-hidden className="text-success size-5 shrink-0" />
              <p className="text-muted-foreground text-sm">该版本未申请额外权限</p>
            </div>
          )}
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="secondary" size="sm" disabled={installing}>
              取消
            </Button>
          </DialogClose>
          <Button
            type="button"
            variant="confirm"
            size="sm"
            disabled={installing}
            aria-busy={installing}
            onClick={handleConfirm}
          >
            {installing
              ? updatingToLatest
                ? '更新中…'
                : '安装中…'
              : updatingToLatest
                ? '同意并更新'
                : '同意并安装'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
