import { Button } from '@ai-workflow/ui/components/button'
import { CodeEditor, type CodeEditorLanguage } from '@ai-workflow/ui/components/code-editor'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@ai-workflow/ui/components/dialog'

interface CodeFieldDialogProps {
  disabled?: boolean
  language: CodeEditorLanguage
  languageLabel: string
  open: boolean
  value: string
  onChange: (value: string) => void
  onConfirm: () => void
  onOpenChange: (open: boolean) => void
}

export function CodeFieldDialog({
  disabled,
  language,
  languageLabel,
  open,
  value,
  onChange,
  onConfirm,
  onOpenChange,
}: CodeFieldDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="h-[min(45rem,calc(100svh-2rem))] max-w-5xl grid-rows-[auto_minmax(0,1fr)_auto]">
        <DialogHeader>
          <DialogTitle>编辑代码</DialogTitle>
        </DialogHeader>

        <div className="bg-input border-input-focus min-h-0 overflow-hidden rounded-lg border">
          <CodeEditor
            aria-label={`${languageLabel} 代码（弹窗）`}
            className="h-full"
            disabled={disabled}
            height="100%"
            language={language}
            value={value}
            onChange={onChange}
          />
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="secondary">
              取消
            </Button>
          </DialogClose>
          <Button type="button" variant="confirm" disabled={disabled} onClick={onConfirm}>
            确定
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
