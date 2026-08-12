import { Button } from '@ai-workflow/ui/components/button'
import { CodeEditor, type CodeEditorLanguage } from '@ai-workflow/ui/components/code-editor'
import { cn } from '@ai-workflow/ui/lib/utils'
import { Maximize2 } from 'lucide-react'
import { useState } from 'react'

import { CodeFieldDialog } from './code-field-dialog'

interface CodeFieldContentProps {
  ariaInvalid: boolean
  ariaLabel: string
  disabled?: boolean
  language: CodeEditorLanguage
  name: string
  required?: boolean
  value: string
  onChange: (value: string) => void
}

export function CodeFieldContent({
  ariaInvalid,
  ariaLabel,
  disabled,
  language,
  name,
  required,
  value,
  onChange,
}: CodeFieldContentProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false),
    [dialogValue, setDialogValue] = useState(value),
    languageLabel = language.toLocaleUpperCase()

  function handleDialogOpen() {
    setDialogValue(value)
    setIsDialogOpen(true)
  }

  function handleDialogOpenChange(open: boolean) {
    setIsDialogOpen(open)

    if (!open) {
      setDialogValue(value)
    }
  }

  function handleDialogConfirm() {
    onChange(dialogValue)
    setIsDialogOpen(false)
  }

  return (
    <>
      <div
        role="group"
        data-slot="code-field"
        data-disabled={disabled}
        data-language={language}
        aria-disabled={disabled}
        aria-label={ariaLabel}
        aria-invalid={ariaInvalid}
        aria-required={required}
        className={cn(
          'bg-input hover:border-input-focus focus-within:border-input-focus aria-invalid:border-destructive dark:aria-invalid:border-destructive/70 flex h-52 w-full flex-col overflow-hidden rounded-lg border border-transparent shadow-none transition-[border-color] outline-none',
          disabled && 'cursor-not-allowed opacity-50',
        )}
      >
        <input type="hidden" name={name} value={value} disabled={disabled} />

        <div className="border-border/50 flex h-9 shrink-0 items-center justify-between border-b px-3">
          <span className="text-foreground text-xs font-semibold tracking-wide">
            {languageLabel}
          </span>
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            disabled={disabled}
            aria-label="在弹窗中编辑代码"
            title="在弹窗中编辑"
            className="text-muted-foreground hover:bg-button-secondary-bg-active hover:text-foreground focus-visible:bg-button-secondary-bg-active"
            onClick={handleDialogOpen}
          >
            <Maximize2 aria-hidden />
          </Button>
        </div>

        <CodeEditor
          aria-label={ariaLabel}
          className="min-h-0 flex-1"
          disabled={disabled}
          language={language}
          value={value}
          onChange={onChange}
        />
      </div>

      <CodeFieldDialog
        disabled={disabled}
        language={language}
        languageLabel={languageLabel}
        open={isDialogOpen}
        value={dialogValue}
        onChange={setDialogValue}
        onConfirm={handleDialogConfirm}
        onOpenChange={handleDialogOpenChange}
      />
    </>
  )
}
