import { Tooltip } from '@/components/tooltip'
import { Button } from '@ai-workflow/ui/components/button'
import { iconBtnClass } from './icon-button-class'
import { cn } from '@ai-workflow/ui/lib/utils'
import { ListTodo } from 'lucide-react'
import type { WorkflowAuxiliaryPanelTriggerProps } from './types'

export const CheckList = ({ active = false, onClick }: WorkflowAuxiliaryPanelTriggerProps) => {
  return (
    <Tooltip content="检查清单" side="bottom">
      <Button
        type="button"
        variant="outline"
        size="icon-sm"
        className={cn(iconBtnClass, 'relative')}
        aria-label="检查清单"
        aria-controls="workflow-auxiliary-panel"
        aria-expanded={active}
        onClick={onClick}
      >
        <ListTodo className="size-4" aria-hidden />
        <span className="absolute -top-1 -right-1 flex size-4 items-center justify-center rounded-full bg-orange-400 text-[10px] leading-none font-medium text-white">
          6
        </span>
      </Button>
    </Tooltip>
  )
}
