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
import { useState } from 'react'

import type { KnowledgeBaseListItem } from '../types'

interface DeleteKnowledgeBaseDialogProps {
  knowledgeBase: KnowledgeBaseListItem
  open: boolean
  onDelete: () => unknown | Promise<unknown>
  onOpenChange: (open: boolean) => void
}

export function DeleteKnowledgeBaseDialog({
  knowledgeBase,
  open,
  onDelete,
  onOpenChange,
}: DeleteKnowledgeBaseDialogProps) {
  const [deleting, setDeleting] = useState(false)

  function handleOpenChange(nextOpen: boolean) {
    if (!deleting) onOpenChange(nextOpen)
  }

  async function handleDelete() {
    if (deleting) return

    setDeleting(true)

    try {
      await onDelete()
      onOpenChange(false)
    } catch {
      // 请求错误由统一 API 拦截器提示，保留弹窗供用户重试。
    } finally {
      setDeleting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent showCloseButton={!deleting}>
        <DialogHeader>
          <DialogTitle>确认删除知识库</DialogTitle>
          <DialogDescription>
            {`删除“${knowledgeBase.title}”后，该知识库将被永久删除且无法恢复。正在被工作流使用时将无法删除。`}
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
            onClick={() => void handleDelete()}
          >
            {deleting ? '删除中…' : '确认删除'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
