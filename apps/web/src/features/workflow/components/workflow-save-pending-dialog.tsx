import { Button } from '@ai-workflow/ui/components/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@ai-workflow/ui/components/dialog'

interface WorkflowSavePendingDialogProps {
  open: boolean
  onLeave: () => void
  onStay: () => void
}

export function WorkflowSavePendingDialog({
  open,
  onLeave,
  onStay,
}: WorkflowSavePendingDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onStay()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>画布尚未保存完成</DialogTitle>
          <DialogDescription>
            当前修改仍在自动保存中。现在离开可能导致最新内容丢失，建议等待保存完成后再返回。
          </DialogDescription>
        </DialogHeader>

        <DialogFooter>
          <Button type="button" variant="secondary" size="sm" onClick={onStay}>
            继续等待
          </Button>
          <Button type="button" variant="destructive" size="sm" onClick={onLeave}>
            仍然离开
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
