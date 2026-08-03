import { Button } from '@ai-workflow/ui/components/button'
import { LoaderCircle, Pause, Play } from 'lucide-react'

interface TestRunProps {
  onClick: () => void
  canPause?: boolean
  pending?: boolean
  pausing?: boolean
}

export const TestRun = ({
  onClick,
  canPause = false,
  pending = false,
  pausing = false,
}: TestRunProps) => {
  return (
    <Button
      type="button"
      variant="secondary"
      size="sm"
      className="text-primary h-8 gap-1.5 rounded-lg px-3 text-[13px]"
      aria-keyshortcuts="Alt+R"
      aria-busy={pausing}
      aria-label={pending ? '暂停测试运行' : '开始测试运行'}
      disabled={pending && (!canPause || pausing)}
      onClick={onClick}
    >
      {pausing ? (
        <LoaderCircle className="size-3.5 animate-spin" aria-hidden="true" />
      ) : pending ? (
        <Pause className="size-3.5" aria-hidden="true" />
      ) : (
        <Play className="size-3.5" aria-hidden="true" />
      )}
      {pausing ? '暂停中' : pending ? '暂停运行' : '测试运行'}
    </Button>
  )
}
