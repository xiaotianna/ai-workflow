import { useFormData } from '@ai-workflow/shared/hooks/use-form-data'
import { validateFormByZod } from '@ai-workflow/shared/utils/validate-form-by-zod'
import { Button } from '@ai-workflow/ui/components/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@ai-workflow/ui/components/dialog'
import { Form } from '@ai-workflow/ui/components/form'
import { Input } from '@ai-workflow/ui/components/input'
import { useEffect, useState, type FormEvent } from 'react'

import { renameDocumentSchema, type RenameDocumentFormInput } from '../schema'
import type { KnowledgeBaseDocument } from '../types'

interface RenameDocumentDialogProps {
  document: KnowledgeBaseDocument
  open: boolean
  onOpenChange: (open: boolean) => void
  onRename: (name: string) => Promise<void>
}

export function RenameDocumentDialog({
  document,
  open,
  onOpenChange,
  onRename,
}: RenameDocumentDialogProps) {
  const { form, setForm, updateFormField } = useFormData<RenameDocumentFormInput>({
      name: document.name,
    }),
    [touched, setTouched] = useState(false),
    [renaming, setRenaming] = useState(false),
    validation = validateFormByZod(renameDocumentSchema, form),
    fieldError = validation.success ? undefined : validation.errors.name,
    isUnchanged = form.name.trim() === document.name

  useEffect(() => {
    if (!open) return

    setForm({ name: document.name })
    setTouched(false)
    setRenaming(false)
  }, [document.id, document.name, open, setForm])

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen && renaming) return
    onOpenChange(nextOpen)
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setTouched(true)

    const result = validateFormByZod(renameDocumentSchema, form)
    if (!result.success || result.data.name === document.name) return

    setRenaming(true)
    try {
      await onRename(result.data.name)
      setRenaming(false)
      onOpenChange(false)
    } catch {
      // 请求错误由统一 API Client 展示，弹窗保持打开供用户重试。
      setRenaming(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent aria-describedby={undefined} showCloseButton={!renaming}>
        <DialogHeader>
          <DialogTitle>重命名文档</DialogTitle>
        </DialogHeader>

        <Form onSubmit={handleSubmit}>
          <Form.Field required label="文档名称" error={touched ? fieldError : undefined}>
            <Input
              aria-label="文档名称"
              aria-invalid={Boolean(touched && fieldError)}
              autoComplete="off"
              disabled={renaming}
              maxLength={255}
              placeholder="输入文档名称"
              value={form.name}
              onBlur={() => setTouched(true)}
              onChange={(event) => updateFormField('name', event.target.value)}
            />
          </Form.Field>

          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="secondary" size="sm" disabled={renaming}>
                取消
              </Button>
            </DialogClose>
            <Button
              type="submit"
              variant="confirm"
              size="sm"
              disabled={!validation.success || isUnchanged || renaming}
            >
              {renaming ? '保存中...' : '保存'}
            </Button>
          </DialogFooter>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
