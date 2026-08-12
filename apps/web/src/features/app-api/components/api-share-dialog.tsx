import type { AppApiOverviewDto } from '@/api/app-api'
import { Button } from '@ai-workflow/ui/components/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@ai-workflow/ui/components/dialog'
import { Switch } from '@ai-workflow/ui/components/switch'
import { showToast } from '@ai-workflow/ui/lib/toast'
import { Copy, LoaderCircle } from 'lucide-react'
import { useEffect, useState } from 'react'

interface ApiShareDialogProps {
  open: boolean
  overview?: AppApiOverviewDto
  saving: boolean
  onOpenChange: (open: boolean) => void
  onSave: (enabled: boolean) => void
}

export function ApiShareDialog({
  open,
  overview,
  saving,
  onOpenChange,
  onSave,
}: ApiShareDialogProps) {
  const [enabled, setEnabled] = useState(false),
    shareUrl = overview?.shareToken
      ? `${globalThis.location.origin}/share/api/${overview.shareToken}`
      : undefined

  useEffect(() => {
    if (open) setEnabled(overview?.shareEnabled ?? false)
  }, [open, overview?.shareEnabled])

  async function copyShareUrl() {
    if (!shareUrl) return
    try {
      await navigator.clipboard.writeText(shareUrl)
      showToast('success', '分享链接已复制')
    } catch {
      showToast('error', '复制失败，请稍后重试')
    }
  }

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !saving && onOpenChange(nextOpen)}>
      <DialogContent showCloseButton={!saving}>
        <DialogHeader>
          <DialogTitle>分享 API 文档</DialogTitle>
          <p className="text-muted-foreground mt-2 text-sm leading-6">
            开启后，任何获得分享链接的人都可以在不登录的情况下查看 API 文档正文。
          </p>
        </DialogHeader>

        <div className="border-border/60 flex items-center justify-between gap-4 rounded-xl border px-3 py-3">
          <div>
            <p className="text-foreground text-sm font-medium">公开分享</p>
            <p className="text-muted-foreground mt-0.5 text-xs">关闭后原分享链接立即失效</p>
          </div>
          <Switch
            aria-label="公开分享 API 文档"
            checked={enabled}
            disabled={saving}
            onCheckedChange={setEnabled}
          />
        </div>

        {enabled && overview?.shareEnabled && shareUrl ? (
          <div className="bg-input flex min-w-0 items-center gap-2 rounded-xl px-3 py-2.5">
            <span className="text-foreground min-w-0 flex-1 truncate text-sm">{shareUrl}</span>
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              className="text-muted-foreground shrink-0"
              aria-label="复制 API 文档分享链接"
              onClick={() => void copyShareUrl()}
            >
              <Copy aria-hidden className="size-4" />
            </Button>
          </div>
        ) : null}

        <DialogFooter>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={saving}
            onClick={() => onOpenChange(false)}
          >
            取消
          </Button>
          <Button
            type="button"
            variant="confirm"
            size="sm"
            disabled={saving || !overview || enabled === overview.shareEnabled}
            onClick={() => onSave(enabled)}
          >
            {saving ? (
              <LoaderCircle
                aria-hidden
                data-icon="inline-start"
                className="animate-spin motion-reduce:animate-none"
              />
            ) : null}
            {saving ? '保存中...' : '保存'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
