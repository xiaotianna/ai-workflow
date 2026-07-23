import { Button } from '@ai-workflow/ui/components/button'
import { Bot } from 'lucide-react'

export const OpenAIPanel = () => {
  return (
    <Button variant={'outline'} size={'icon-sm'} className="rounded-lg">
      <Bot size={3} />
    </Button>
  )
}
