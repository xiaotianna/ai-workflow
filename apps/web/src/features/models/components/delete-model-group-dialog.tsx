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

import { type ModelGroup } from '../schema'

interface DeleteModelGroupDialogProps {
  group?: ModelGroup
  open: boolean
  onDelete: () => void
  onOpenChange: (open: boolean) => void
}

export function DeleteModelGroupDialog({
  group,
  open,
  onDelete,
  onOpenChange,
}: DeleteModelGroupDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>删除模型组</DialogTitle>
          <DialogDescription>
            确定删除“{group?.name}”吗？该模型组中的 {group?.models.length ?? 0}{' '}
            个模型配置也会一并移除。
          </DialogDescription>
        </DialogHeader>

        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="secondary" size="sm">
              取消
            </Button>
          </DialogClose>
          <Button type="button" variant="destructive" size="sm" onClick={onDelete}>
            删除
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
