import { ComposerPrimitive } from '@assistant-ui/react'
import { cn } from '@ai-workflow/ui/lib/utils'
import type { ComponentProps } from 'react'

export function PromptInput({
  className,
  ...props
}: ComponentProps<typeof ComposerPrimitive.Root>) {
  return (
    <ComposerPrimitive.Root
      data-slot="prompt-input"
      className={cn(
        'bg-input hover:bg-background hover:border-input-focus has-focus-visible:bg-background has-focus-visible:border-input-focus flex flex-col gap-2 rounded-[24px] border border-transparent p-2.5 transition-[background-color,border-color] motion-reduce:transition-none',
        className,
      )}
      {...props}
    />
  )
}

export function PromptInputTextarea({
  className,
  ...props
}: ComponentProps<typeof ComposerPrimitive.Input>) {
  return (
    <ComposerPrimitive.Input
      data-slot="prompt-input-textarea"
      minRows={2}
      maxRows={6}
      cancelOnEscape={false}
      unstable_focusOnRunStart={false}
      unstable_focusOnScrollToBottom={false}
      unstable_focusOnThreadSwitched={false}
      addAttachmentOnPaste={false}
      className={cn(
        'placeholder:text-input-placeholder min-h-13 w-full resize-none border-0 bg-transparent px-2 py-1.5 text-sm outline-none',
        className,
      )}
      {...props}
    />
  )
}

export function PromptInputToolbar({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      data-slot="prompt-input-toolbar"
      className={cn('flex min-w-0 items-center gap-1', className)}
      {...props}
    />
  )
}
