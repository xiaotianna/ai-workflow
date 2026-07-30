import { useFormData } from '@ai-workflow/shared/hooks/use-form-data'
import { validateFormByZod } from '@ai-workflow/shared/utils/validate-form-by-zod'
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
import { FileDropzone } from '@ai-workflow/ui/components/file-dropzone'
import { Form } from '@ai-workflow/ui/components/form'
import { useRef, useState, type FormEvent } from 'react'

import { IMPORT_DSL_INITIAL_VALUES, importDslSchema, type ImportDslFormInput } from '../schema'

interface ImportDslDialogProps {
  open: boolean
  onImport: (dsl: unknown) => unknown | Promise<unknown>
  onOpenChange: (open: boolean) => void
  confirmLabel?: string
  description?: string
  title?: string
}

export function ImportDslDialog({
  open,
  onImport,
  onOpenChange,
  confirmLabel = '导入',
  description = '上传 DSL 文件以导入当前工作流配置',
  title = '导入 DSL',
}: ImportDslDialogProps) {
  const { form, resetForm, updateForm } = useFormData<ImportDslFormInput>(IMPORT_DSL_INITIAL_VALUES)
  const [reading, setReading] = useState(false)
  const [importing, setImporting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const fileReadRevision = useRef(0)
  const validationResult = validateFormByZod(importDslSchema, form)
  const fileError =
    !reading && (submitted || form.file)
      ? validationResult.success
        ? undefined
        : (validationResult.errors.file ?? validationResult.errors.content)
      : undefined

  function resetDialog() {
    fileReadRevision.current += 1
    resetForm()
    setReading(false)
    setImporting(false)
    setSubmitted(false)
  }

  function handleOpenChange(nextOpen: boolean) {
    if (importing && !nextOpen) return
    if (!nextOpen) resetDialog()
    onOpenChange(nextOpen)
  }

  async function handleFileChange(file: File | undefined) {
    const revision = fileReadRevision.current + 1

    fileReadRevision.current = revision
    setSubmitted(false)
    updateForm({
      file,
      content: '',
    })

    if (!file) return

    setReading(true)

    try {
      const content = await file.text()

      if (fileReadRevision.current === revision) {
        updateForm({
          file,
          content,
        })
      }
    } finally {
      if (fileReadRevision.current === revision) {
        setReading(false)
      }
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitted(true)

    const result = validateFormByZod(importDslSchema, form)

    if (!result.success) return

    setImporting(true)

    try {
      await onImport(JSON.parse(result.data.content) as unknown)
      resetDialog()
      onOpenChange(false)
    } catch {
      setImporting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <Form onSubmit={handleSubmit}>
          <Form.Field required label="" error={fileError}>
            <FileDropzone
              file={form.file}
              accept=".json,application/json"
              disabled={reading || importing}
              aria-invalid={Boolean(fileError)}
              onFileChange={(file) => void handleFileChange(file)}
            />
          </Form.Field>

          <DialogFooter className="pt-1">
            <DialogClose asChild>
              <Button type="button" variant="secondary" size="sm">
                取消
              </Button>
            </DialogClose>
            <Button
              type="submit"
              variant="confirm"
              size="sm"
              disabled={reading || importing || !validationResult.success}
            >
              {importing ? '导入中...' : confirmLabel}
            </Button>
          </DialogFooter>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
