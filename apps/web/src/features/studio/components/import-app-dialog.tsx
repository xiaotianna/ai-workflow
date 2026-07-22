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
import { useState, type FormEvent } from 'react'

const maxDslFileSize = 10 * 1024 * 1024

interface ImportAppDialogProps {
  open: boolean
  onImport: (file: File) => void
  onOpenChange: (open: boolean) => void
}

function getFileError(file: File) {
  if (!/\.ya?ml$/i.test(file.name)) return '仅支持 .yml 或 .yaml 格式的 DSL 文件'
  if (file.size > maxDslFileSize) return 'DSL 文件不能超过 10 MB'
  return undefined
}

export function ImportAppDialog({ open, onImport, onOpenChange }: ImportAppDialogProps) {
  const [selectedFile, setSelectedFile] = useState<File>()
  const [fileError, setFileError] = useState<string>()

  function resetForm() {
    setSelectedFile(undefined)
    setFileError(undefined)
  }

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) resetForm()
    onOpenChange(nextOpen)
  }

  function handleFileChange(file: File | undefined) {
    if (!file) return

    const error = getFileError(file)
    setFileError(error)
    setSelectedFile(error ? undefined : file)
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!selectedFile) return

    onImport(selectedFile)
    resetForm()
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>导入应用</DialogTitle>
          <DialogDescription>上传应用 DSL 文件以创建应用。</DialogDescription>
        </DialogHeader>

        <Form onSubmit={handleSubmit}>
          <Form.Field required label="" error={fileError}>
            <FileDropzone
              file={selectedFile}
              accept=".yml,.yaml,application/x-yaml,text/yaml"
              aria-invalid={Boolean(fileError)}
              onFileChange={handleFileChange}
            />
          </Form.Field>

          <DialogFooter className="pt-1">
            <DialogClose asChild>
              <Button type="button" variant="secondary" size="sm">
                取消
              </Button>
            </DialogClose>
            <Button type="submit" variant="confirm" size="sm" disabled={!selectedFile}>
              导入
            </Button>
          </DialogFooter>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
