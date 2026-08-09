import { Button } from '@ai-workflow/ui/components/button'
import { Form } from '@ai-workflow/ui/components/form'
import { cn } from '@ai-workflow/ui/lib/utils'
import { ArrowRight, CloudUpload, FileText, Trash2 } from 'lucide-react'
import { useRef, useState, type DragEvent } from 'react'

import { documentAcceptedFileTypes } from '../constants'
import { AddDocumentStepHeader } from './add-document-step-header'

interface AddDocumentSourceStepProps {
  error?: string
  files: readonly File[]
  onBack: () => void
  onFilesChange: (files: File[]) => void
  onNext: () => void
}

function formatFileSize(size: number) {
  if (size < 1024) return `${size} B`
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`
  return `${(size / 1024 / 1024).toFixed(1)} MB`
}

function getFileExtension(fileName: string) {
  return fileName.split('.').pop()?.toUpperCase() ?? 'FILE'
}

function mergeFiles(currentFiles: readonly File[], incomingFiles: readonly File[]) {
  const nextFiles = [...currentFiles]
  const fileKeys = new Set(
    currentFiles.map((file) => `${file.name}:${file.size}:${file.lastModified}`),
  )

  incomingFiles.forEach((file) => {
    const key = `${file.name}:${file.size}:${file.lastModified}`

    if (!fileKeys.has(key)) {
      fileKeys.add(key)
      nextFiles.push(file)
    }
  })

  return nextFiles
}

export function AddDocumentSourceStep({
  error,
  files,
  onBack,
  onFilesChange,
  onNext,
}: AddDocumentSourceStepProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const dragDepthRef = useRef(0)
  const [dragging, setDragging] = useState(false)

  function appendFiles(nextFiles: FileList | File[]) {
    onFilesChange(mergeFiles(files, Array.from(nextFiles)))
  }

  function handleDragEnter(event: DragEvent<HTMLButtonElement>) {
    event.preventDefault()
    dragDepthRef.current += 1
    setDragging(true)
  }

  function handleDragLeave(event: DragEvent<HTMLButtonElement>) {
    event.preventDefault()
    dragDepthRef.current = Math.max(0, dragDepthRef.current - 1)
    if (dragDepthRef.current === 0) setDragging(false)
  }

  return (
    <section className="bg-background flex h-full min-h-0 flex-col">
      <AddDocumentStepHeader currentStep={1} onBack={onBack} />

      <div className="min-h-0 flex-1 overflow-auto px-5 pb-8 sm:px-8">
        <div className="mx-auto w-full max-w-3xl">
          <div className="text-text-secondary mt-[30px] mb-[44px] text-lg/6 font-semibold">
            上传文本文件
          </div>

          <Form.Field
            required
            label={<span className="sr-only">上传文本文件</span>}
            error={error}
            className="[&_[data-slot=form-control]]:mt-0"
          >
            <input
              ref={inputRef}
              type="file"
              multiple
              tabIndex={-1}
              accept={documentAcceptedFileTypes}
              className="sr-only"
              onChange={(event) => {
                if (event.target.files) appendFiles(event.target.files)
                event.target.value = ''
              }}
            />
            <button
              type="button"
              aria-label="选择或拖拽上传文档文件"
              aria-invalid={Boolean(error)}
              data-dragging={dragging}
              className="border-border bg-muted/25 text-muted-foreground hover:border-input-focus hover:bg-muted/45 focus-visible:border-input-focus focus-visible:bg-muted/45 data-[dragging=true]:border-primary data-[dragging=true]:bg-primary/5 aria-invalid:border-destructive aria-invalid:bg-destructive/5 flex min-h-36 w-full cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border border-dashed px-6 py-7 text-sm transition-[background-color,border-color] outline-none"
              onClick={() => inputRef.current?.click()}
              onDragEnter={handleDragEnter}
              onDragLeave={handleDragLeave}
              onDragOver={(event) => {
                event.preventDefault()
                event.dataTransfer.dropEffect = 'copy'
              }}
              onDrop={(event) => {
                event.preventDefault()
                dragDepthRef.current = 0
                setDragging(false)
                appendFiles(event.dataTransfer.files)
              }}
            >
              <span className="text-foreground flex items-center justify-center gap-2.5 font-medium">
                <CloudUpload aria-hidden className="size-5" />
                拖拽文件至此，或者 <span className="text-primary font-medium">选择文件</span>
              </span>
              <span className="text-muted-foreground max-w-2xl text-left text-xs leading-5">
                已支持 PDF、Word、PowerPoint、Excel、HTML、Markdown 与
                TXT；支持多选，可继续添加文件； 单个文件不超过 15 MB。
              </span>
            </button>
          </Form.Field>

          {files.length > 0 ? (
            <div className="mt-5 space-y-1.5" aria-live="polite">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-medium">已选择文件</h2>
                <span className="text-muted-foreground text-xs">共 {files.length} 个</span>
              </div>
              {files.map((file) => (
                <div
                  key={`${file.name}:${file.size}:${file.lastModified}`}
                  className="border-border/60 bg-background flex min-h-11 items-center gap-2.5 rounded-lg border-[0.5px] px-2.5 py-2 shadow-xs transition-shadow duration-200 ease-out hover:shadow-md motion-reduce:transition-none"
                >
                  <span className="bg-primary/8 text-primary flex size-8 shrink-0 items-center justify-center rounded-lg">
                    <FileText aria-hidden className="size-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="text-foreground block truncate text-sm font-medium">
                      {file.name}
                    </span>
                    <span className="text-muted-foreground mt-0.5 block text-xs">
                      {getFileExtension(file.name)} · {formatFileSize(file.size)}
                    </span>
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    aria-label={`移除文件 ${file.name}`}
                    className="text-muted-foreground hover:text-destructive focus-visible:text-destructive"
                    onClick={() => onFilesChange(files.filter((item) => item !== file))}
                  >
                    <Trash2 aria-hidden className="size-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </div>

      <footer className="border-border flex h-14 shrink-0 items-center justify-end border-t px-5 sm:px-8">
        <Button
          type="button"
          size="sm"
          className={cn('min-w-24', files.length === 0 && 'shadow-none')}
          disabled={files.length === 0}
          onClick={onNext}
        >
          下一步
          <ArrowRight aria-hidden className="size-4" />
        </Button>
      </footer>
    </section>
  )
}
