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

import type { KnowledgeBaseDocument } from '../types'

interface DeleteDocumentDialogProps {
  documents: KnowledgeBaseDocument[]
  open: boolean
  onDelete: () => Promise<void>
  onOpenChange: (open: boolean) => void
}

export function DeleteDocumentDialog({
  documents,
  open,
  onDelete,
  onOpenChange,
}: DeleteDocumentDialogProps) {
  const [deleting, setDeleting] = useState(false)

  async function handleDelete() {
    setDeleting(true)
    try {
      await onDelete()
      onOpenChange(false)
    } catch {
      // 请求错误由统一 API Client 展示，弹窗保持打开供用户重试。
    } finally {
      setDeleting(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        if (!deleting) onOpenChange(value)
      }}
    >
      <DialogContent showCloseButton={!deleting}>
        <DialogHeader>
          <DialogTitle>
            {documents.length > 1 ? `确认删除 ${documents.length} 个文档` : '确认删除文档'}
          </DialogTitle>
          <DialogDescription>
            {documents.length > 1
              ? `所选 ${documents.length} 个文档的原文件和全部分段将被永久删除，且无法恢复。`
              : `“${documents[0]?.name ?? ''}”的原文件和全部分段将被永久删除，且无法恢复。`}
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
            {deleting ? '删除中…' : '确认删除'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
