import * as React from 'react'
import { CloudUpload, FileText } from 'lucide-react'

import { cn } from '../lib/utils'

interface FileDropzoneProps extends Omit<
  React.ComponentProps<'button'>,
  | 'children'
  | 'onChange'
  | 'onClick'
  | 'onDragEnter'
  | 'onDragLeave'
  | 'onDragOver'
  | 'onDrop'
  | 'type'
> {
  accept?: string
  file?: File
  inputName?: string
  onFileChange?: (file: File | undefined) => void
}

function formatFileSize(size: number) {
  if (size < 1024) return `${size} B`
  if (size < 1024 * 1024) return `${Math.ceil(size / 1024)} KB`
  return `${(size / 1024 / 1024).toFixed(1)} MB`
}

function FileDropzone({
  accept,
  'aria-label': ariaLabel = '选择或拖拽上传文件',
  className,
  disabled,
  file,
  inputName,
  onFileChange,
  ...props
}: FileDropzoneProps) {
  const inputRef = React.useRef<HTMLInputElement>(null)
  const dragDepthRef = React.useRef(0)
  const [isDragging, setIsDragging] = React.useState(false)

  function resetDragState() {
    dragDepthRef.current = 0
    setIsDragging(false)
  }

  function handleDragEnter(event: React.DragEvent<HTMLButtonElement>) {
    event.preventDefault()
    if (disabled) return
    dragDepthRef.current += 1
    setIsDragging(true)
  }

  function handleDragLeave(event: React.DragEvent<HTMLButtonElement>) {
    event.preventDefault()
    if (disabled) return
    dragDepthRef.current = Math.max(0, dragDepthRef.current - 1)
    if (dragDepthRef.current === 0) setIsDragging(false)
  }

  function handleDragOver(event: React.DragEvent<HTMLButtonElement>) {
    event.preventDefault()
    event.dataTransfer.dropEffect = disabled ? 'none' : 'copy'
  }

  function handleDrop(event: React.DragEvent<HTMLButtonElement>) {
    event.preventDefault()
    resetDragState()
    if (disabled) return
    onFileChange?.(event.dataTransfer.files.item(0) ?? undefined)
  }

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        name={inputName}
        accept={accept}
        disabled={disabled}
        tabIndex={-1}
        className="sr-only"
        onChange={(event) => {
          onFileChange?.(event.target.files?.item(0) ?? undefined)
          event.target.value = ''
        }}
      />
      <button
        type="button"
        data-slot="file-dropzone"
        data-dragging={isDragging}
        aria-label={ariaLabel}
        disabled={disabled}
        className={cn(
          'border-border bg-muted/25 text-muted-foreground hover:border-input-focus hover:bg-muted/45 focus-visible:border-input-focus focus-visible:bg-muted/45 data-[dragging=true]:border-primary data-[dragging=true]:bg-primary/5 aria-invalid:border-destructive aria-invalid:bg-destructive/5 flex min-h-24 w-full cursor-pointer items-center justify-center gap-3 rounded-2xl border border-dashed px-6 py-5 text-left text-sm transition-[background-color,border-color,box-shadow] outline-none focus-visible:shadow-sm disabled:cursor-not-allowed disabled:opacity-50',
          className,
        )}
        onClick={() => inputRef.current?.click()}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        {...props}
      >
        {file ? (
          <>
            <FileText className="size-7 shrink-0" strokeWidth={1.75} />
            <span className="flex min-w-0 flex-col gap-0.5" aria-live="polite">
              <span className="text-foreground max-w-full truncate font-medium">{file.name}</span>
              <span className="text-muted-foreground text-xs">
                {formatFileSize(file.size)} · 点击重新选择
              </span>
            </span>
          </>
        ) : (
          <>
            <CloudUpload className="size-7 shrink-0" strokeWidth={1.75} />
            <span>
              拖拽文件至此，或者 <span className="text-primary font-medium">选择文件</span>
            </span>
          </>
        )}
      </button>
    </>
  )
}

export { FileDropzone }
export type { FileDropzoneProps }
