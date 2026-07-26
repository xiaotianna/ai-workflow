import { Button } from '@ai-workflow/ui/components/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@ai-workflow/ui/components/dialog'
import { FileDropzone } from '@ai-workflow/ui/components/file-dropzone'
import { Form } from '@ai-workflow/ui/components/form'
import { useForm } from '@tanstack/react-form'
import { useEffect } from 'react'

import { documentAcceptedFileTypes, documentMaxFileSizeBytes } from '../constants'
import type { AddDocumentInput } from '../types'

interface AddDocumentDialogProps {
  open: boolean
  onAdd: (input: AddDocumentInput) => void
  onOpenChange: (open: boolean) => void
}

function validateFile(file: File | undefined) {
  if (!file) {
    return '请选择文件'
  }

  if (file.size > documentMaxFileSizeBytes) {
    return '文件大小不能超过 15 MB'
  }

  return undefined
}

export function AddDocumentDialog({ open, onAdd, onOpenChange }: AddDocumentDialogProps) {
  const form = useForm({
    defaultValues: {
      file: undefined as File | undefined,
    },
    onSubmit: ({ value }) => {
      if (!value.file) return

      onAdd({ file: value.file })
      form.reset()
      onOpenChange(false)
    },
  })

  useEffect(() => {
    if (!open) {
      form.reset()
    }
  }, [form, open])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle>添加文件</DialogTitle>
        </DialogHeader>

        <form
          onSubmit={(event) => {
            event.preventDefault()
            event.stopPropagation()
            void form.handleSubmit()
          }}
        >
          <Form>
            <form.Field
              name="file"
              validators={{
                onChange: ({ value }) => validateFile(value),
                onSubmit: ({ value }) => validateFile(value),
              }}
            >
              {(field) => (
                <Form.Field
                  required
                  label="文件"
                  error={
                    field.state.meta.isTouched && field.state.meta.errors.length
                      ? field.state.meta.errors.join('，')
                      : undefined
                  }
                >
                  <FileDropzone
                    accept={documentAcceptedFileTypes}
                    file={field.state.value}
                    aria-label="选择或拖拽上传文档文件"
                    onFileChange={(file) => field.handleChange(file)}
                  />
                </Form.Field>
              )}
            </form.Field>

            <form.Subscribe selector={(state) => [state.canSubmit, state.isSubmitting]}>
              {([canSubmit, isSubmitting]) => (
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
                    disabled={!canSubmit || isSubmitting}
                  >
                    添加
                  </Button>
                </DialogFooter>
              )}
            </form.Subscribe>
          </Form>
        </form>
      </DialogContent>
    </Dialog>
  )
}
