import { cn } from '@ai-workflow/ui/lib/utils'
import { createMarkdownRenderer } from 'fumadocs-core/content/md'

const { Markdown } = createMarkdownRenderer()

interface PluginMarkdownProps {
  children: string
  className?: string
}

export function PluginMarkdown({ children, className }: PluginMarkdownProps) {
  return (
    <div className={cn('prose prose-sm prose-no-margin max-w-none min-w-0', className)}>
      <Markdown>{children}</Markdown>
    </div>
  )
}
