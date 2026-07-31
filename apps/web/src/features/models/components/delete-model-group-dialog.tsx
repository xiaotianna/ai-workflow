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
import { useEffect, useState } from 'react'

import { type ModelGroup } from '../schema'

interface DeleteModelGroupDialogProps {
  group?: ModelGroup
  open: boolean
  onDelete: () => Promise<void>
  onOpenChange: (open: boolean) => void
}

export function DeleteModelGroupDialog({
  group,
  open,
  onDelete,
  onOpenChange,
}: DeleteModelGroupDialogProps) {
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    if (open) setIsDeleting(false)
  }, [open])

  async function handleDelete() {
    setIsDeleting(true)

    try {
      await onDelete()
    } catch {
      setIsDeleting(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen && isDeleting) return
        onOpenChange(nextOpen)
      }}
    >
      <DialogContent onOpenAutoFocus={(event) => event.preventDefault()}>
        <DialogHeader>
          <DialogTitle>删除模型组</DialogTitle>
          <DialogDescription>
            确定删除“{group?.name}”吗？该模型组中的 {group?.models.length ?? 0}{' '}
            个模型配置也会一并移除。
          </DialogDescription>
        </DialogHeader>

        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="secondary" size="sm" disabled={isDeleting}>
              取消
            </Button>
          </DialogClose>
          <Button
            type="button"
            variant="destructive"
            size="sm"
            disabled={isDeleting}
            onClick={() => void handleDelete()}
          >
            {isDeleting ? '删除中...' : '删除'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
