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
import { useState } from 'react'

import { uninstallPlugin, type UninstalledPluginDto } from '@/api/plugins'
import type { PluginListItem } from '../types'

interface PluginUninstallationDialogProps {
  plugin: PluginListItem
  open: boolean
  onOpenChange: (open: boolean) => void
  onUninstalled: (result: UninstalledPluginDto) => void
}

export function PluginUninstallationDialog({
  plugin,
  open,
  onOpenChange,
  onUninstalled,
}: PluginUninstallationDialogProps) {
  const [uninstalling, setUninstalling] = useState(false),
    usage = plugin.usage,
    blocked = Boolean(usage && usage.workflowCount > 0)

  function handleOpenChange(nextOpen: boolean) {
    if (!uninstalling) onOpenChange(nextOpen)
  }

  async function handleUninstall() {
    if (blocked) return
    setUninstalling(true)

    try {
      const result = await uninstallPlugin(plugin.id)
      onUninstalled(result)
      showToast('success', '插件已卸载')
      onOpenChange(false)
    } catch {
      // 请求错误由统一 API 拦截器提示，保留弹窗供用户重试。
    } finally {
      setUninstalling(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg" showCloseButton={!uninstalling}>
        <DialogHeader>
          <DialogTitle>{`卸载 ${plugin.title}`}</DialogTitle>
          <DialogDescription>
            {blocked && usage
              ? `当前有 ${usage.workflowCount} 个工作流正在使用该插件（草稿 ${usage.draftWorkflowCount} 个、历史或发布版本 ${usage.versionWorkflowCount} 个），因此不允许卸载。请先移除草稿引用；不可变版本仍有引用时，需要处理对应工作流后再卸载。`
              : '卸载后，该插件将不再出现在当前编辑器的插件目录中。'}
          </DialogDescription>
        </DialogHeader>

        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="secondary" size="sm" disabled={uninstalling}>
              取消
            </Button>
          </DialogClose>
          <Button
            type="button"
            variant="destructive"
            size="sm"
            disabled={uninstalling || blocked}
            aria-busy={uninstalling}
            onClick={() => void handleUninstall()}
          >
            {uninstalling ? '卸载中…' : blocked ? '存在工作流引用' : '确认卸载'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
