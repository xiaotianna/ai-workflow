import type { CreatedAppApiKeyDto } from '@/api/app-api'
import { Button } from '@ai-workflow/ui/components/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@ai-workflow/ui/components/dialog'
import { showToast } from '@ai-workflow/ui/lib/toast'
import { Copy } from 'lucide-react'

interface CreatedApiKeyDialogProps {
  createdKey?: CreatedAppApiKeyDto
  onClose: () => void
}

export function CreatedApiKeyDialog({ createdKey, onClose }: CreatedApiKeyDialogProps) {
  async function copyKey() {
    if (!createdKey) return

    try {
      await navigator.clipboard.writeText(createdKey.key)
      showToast('success', 'API 密钥已复制')
    } catch {
      showToast('error', '复制失败，请手动保存密钥')
    }
  }

  return (
    <Dialog open={Boolean(createdKey)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl gap-6">
        <DialogHeader>
          <DialogTitle>API 密钥</DialogTitle>
          <p className="text-muted-foreground mt-2 text-sm leading-6">
            请立即将此密钥保存在安全且可访问的地方，关闭后将无法再次查看。
          </p>
        </DialogHeader>

        <div className="bg-input flex min-w-0 items-center gap-2 rounded-xl px-3 py-2.5">
          <code className="text-foreground min-w-0 flex-1 truncate font-mono text-sm">
            {createdKey?.key}
          </code>
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            className="text-muted-foreground shrink-0"
            aria-label="复制新创建的 API 密钥"
            onClick={() => void copyKey()}
          >
            <Copy aria-hidden className="size-4" />
          </Button>
        </div>

        <DialogFooter>
          <Button type="button" variant="confirm" size="sm" onClick={onClose}>
            好的
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
