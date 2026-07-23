import { Button } from '@ai-workflow/ui/components/button'
import { Play } from 'lucide-react'

export const TestRun = () => {
  return (
    <Button
      type="button"
      variant="secondary"
      size="sm"
      className="text-primary h-8 gap-1.5 rounded-lg px-3 text-[13px]"
    >
      <Play className="size-3.5" />
      测试运行
    </Button>
  )
}
