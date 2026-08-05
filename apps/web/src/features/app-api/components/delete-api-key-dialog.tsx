import type { AppApiKeyDto } from '@/api/app-api'
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

interface DeleteApiKeyDialogProps {
  apiKey?: AppApiKeyDto
  deleting: boolean
  onDelete: () => void
  onOpenChange: (open: boolean) => void
}

export function DeleteApiKeyDialog({
  apiKey,
  deleting,
  onDelete,
  onOpenChange,
}: DeleteApiKeyDialogProps) {
  return (
    <Dialog open={Boolean(apiKey)} onOpenChange={(nextOpen) => !deleting && onOpenChange(nextOpen)}>
      <DialogContent showCloseButton={!deleting}>
        <DialogHeader>
          <DialogTitle>确认删除 API 密钥</DialogTitle>
          <DialogDescription>
            删除“{apiKey?.maskedKey}”后，使用此密钥的 API 调用将立即失效，且无法恢复。
          </DialogDescription>
        </DialogHeader>

        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="secondary" size="sm" disabled={deleting}>
              取消
            </Button>
          </DialogClose>
          <Button
            type="button"
            variant="destructive"
            size="sm"
            disabled={deleting}
            aria-busy={deleting}
            onClick={onDelete}
          >
            {deleting ? '删除中…' : '确认删除'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
