import { Button } from '@ai-workflow/ui/components/button'
import { Bot } from 'lucide-react'

export const OpenAIPanel = () => {
  return (
    <Button
      type="button"
      variant="outline"
      size="icon-sm"
      className="rounded-lg"
      aria-label="打开 AI 面板"
    >
      <Bot className="size-4" aria-hidden />
    </Button>
  )
}
