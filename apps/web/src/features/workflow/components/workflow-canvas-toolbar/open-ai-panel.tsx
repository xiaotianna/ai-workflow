import { Button } from '@ai-workflow/ui/components/button'
import { Bot, LoaderCircle } from 'lucide-react'
import { useWorkflowAgent } from '../../agent/workflow-agent-provider'
import { ToolbarTooltip } from './toolbar-tooltip'

export const OpenAIPanel = ({ open, onClick }: { open: boolean; onClick: () => void }) => {
  const agent = useWorkflowAgent(),
    label = agent.active
      ? `AI 助手：${agent.phase}`
      : agent.unread === 'success'
        ? 'AI 助手已完成，有未读结果'
        : agent.unread === 'error'
          ? 'AI 助手运行失败，有未读结果'
          : open
            ? '收起 AI 助手'
            : '展开 AI 助手'
  return (
    <ToolbarTooltip label={label} shortcut={[]}>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        className="aria-expanded:bg-accent aria-expanded:text-primary relative rounded-lg"
        aria-label={label}
        aria-expanded={open}
        aria-controls="workflow-ai-panel"
        aria-busy={agent.active}
        onClick={onClick}
      >
        {agent.active ? (
          <LoaderCircle className="size-4 motion-safe:animate-spin" aria-hidden />
        ) : (
          <Bot className="size-4" aria-hidden />
        )}
        {agent.unread && (
          <span
            className={`absolute top-1 right-1 size-1.5 rounded-full ${agent.unread === 'success' ? 'bg-success' : 'bg-destructive'}`}
            aria-hidden
          />
        )}
      </Button>
    </ToolbarTooltip>
  )
}
