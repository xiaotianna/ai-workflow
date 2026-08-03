import type { StudioWorkflowVersionDto } from '@/api/studio'
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

interface DeleteWorkflowVersionDialogProps {
  open: boolean
  version?: StudioWorkflowVersionDto
  onDelete: () => Promise<void>
  onOpenChange: (open: boolean) => void
}

export function DeleteWorkflowVersionDialog({
  open,
  version,
  onDelete,
  onOpenChange,
}: DeleteWorkflowVersionDialogProps) {
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    if (open) setDeleting(false)
  }, [open])

  async function handleDelete() {
    setDeleting(true)
    try {
      await onDelete()
      setDeleting(false)
      onOpenChange(false)
    } catch {
      setDeleting(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen && deleting) return
        onOpenChange(nextOpen)
      }}
    >
      <DialogContent
        showCloseButton={!deleting}
        onOpenAutoFocus={(event) => event.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>删除版本</DialogTitle>
          <DialogDescription>
            确定删除“{version?.name ?? '未命名'}”吗？删除后无法恢复。
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
            onClick={() => void handleDelete()}
          >
            {deleting ? '删除中...' : '删除'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
