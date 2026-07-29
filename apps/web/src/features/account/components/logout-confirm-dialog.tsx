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

interface LogoutConfirmDialogProps {
  open: boolean
  isSubmitting: boolean
  onConfirm: () => void
  onOpenChange: (open: boolean) => void
}

export function LogoutConfirmDialog({
  open,
  isSubmitting,
  onConfirm,
  onOpenChange,
}: LogoutConfirmDialogProps) {
  function handleOpenChange(nextOpen: boolean) {
    if (!isSubmitting) {
      onOpenChange(nextOpen)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent showCloseButton={!isSubmitting}>
        <DialogHeader>
          <DialogTitle>确认退出登录</DialogTitle>
          <DialogDescription>退出后需要重新登录才能继续使用当前账户。</DialogDescription>
        </DialogHeader>

        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="secondary" size="sm" disabled={isSubmitting}>
              取消
            </Button>
          </DialogClose>
          <Button
            type="button"
            variant="destructive"
            size="sm"
            disabled={isSubmitting}
            aria-busy={isSubmitting}
            onClick={onConfirm}
          >
            {isSubmitting ? '退出中…' : '退出登录'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
