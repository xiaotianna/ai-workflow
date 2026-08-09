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
  const [confirmingVersionChange, setConfirmingVersionChange] = useState(false)
  const updating = plugin.installation !== null
  const targetVersion = version ?? plugin.latestVersion
  const switchingVersion =
    plugin.installation !== null && plugin.installation.versionId !== targetVersion.id
  const updatingToLatest = plugin.updateAvailable && targetVersion.id === plugin.latestVersion.id
  const grantedPermissions = new Set(plugin.installation?.grantedPermissions)
  const permissions = targetVersion.permissions
  const actionLabel = updatingToLatest ? '更新' : switchingVersion ? '切换' : '安装'

  function handleOpenChange(nextOpen: boolean) {
    if (installing && !nextOpen) return
    if (!nextOpen) setConfirmingVersionChange(false)
    onOpenChange(nextOpen)
  }

  function handleVersionChangeConfirmationOpenChange(nextOpen: boolean) {
    if (installing && !nextOpen) return
    setConfirmingVersionChange(nextOpen)
  }

  function handlePrimaryConfirm() {
    if (switchingVersion) {
      setConfirmingVersionChange(true)
      return
    }

    void handleConfirm()
  }

  async function handleConfirm() {
    setInstalling(true)

    try {
      const result = await installPlugin(plugin.id, {
        versionId: targetVersion.id,
        permissions,
        ...(switchingVersion ? { acknowledgeVersionChange: true } : {}),
      })
      onInstalled(result)
      showToast(
        'success',
        updatingToLatest ? '插件已更新' : switchingVersion ? '插件版本已切换' : '插件已安装',
      )
      onOpenChange(false)
      setConfirmingVersionChange(false)
    } catch {
      // 请求错误由统一 API 拦截器提示，保留弹窗供用户重试。
    } finally {
      setInstalling(false)
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="max-w-lg" showCloseButton={!installing}>
          <DialogHeader>
            <DialogTitle>{`${actionLabel} ${plugin.title} v${targetVersion.version}`}</DialogTitle>
            <DialogDescription>
              {updating
                ? `将当前安装版本从 v${plugin.installation?.version} 切换到 v${targetVersion.version}。请确认目标版本需要的权限。`
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
              onClick={handlePrimaryConfirm}
            >
              {installing
                ? `${actionLabel}中…`
                : switchingVersion
                  ? '确认切换版本'
                  : `同意并${actionLabel}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={open && confirmingVersionChange}
        onOpenChange={handleVersionChangeConfirmationOpenChange}
      >
        <DialogContent className="max-w-md" showCloseButton={!installing}>
          <DialogHeader>
            <DialogTitle>确认切换插件版本？</DialogTitle>
            <DialogDescription>
              {`将 ${plugin.title} 从 v${plugin.installation?.version} 切换到 v${targetVersion.version}。`}
            </DialogDescription>
          </DialogHeader>

          <div className="border-warning/20 bg-warning/5 rounded-lg border p-3">
            <p className="text-foreground text-sm leading-5">
              {plugin.usage
                ? `当前有 ${plugin.usage.workflowCount} 个工作流引用该插件，其中 ${plugin.usage.draftWorkflowCount} 个草稿将在下次加载时切换到目标版本。`
                : '编辑中的工作流将在下次加载时使用目标版本。'}
              已发布、历史版本和已有运行继续使用各自锁定的版本。
            </p>
          </div>

          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="secondary" size="sm" disabled={installing}>
                返回
              </Button>
            </DialogClose>
            <Button
              type="button"
              variant="confirm"
              size="sm"
              disabled={installing}
              aria-busy={installing}
              onClick={() => void handleConfirm()}
            >
              {installing ? '切换中…' : '仍要切换'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
