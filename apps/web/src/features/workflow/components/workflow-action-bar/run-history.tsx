import { Tooltip } from '@/components/tooltip'
import { Button } from '@ai-workflow/ui/components/button'
import { Clock3 } from 'lucide-react'
import { iconBtnClass } from './icon-button-class'
import type { WorkflowAuxiliaryPanelTriggerProps } from './types'

export const RunHistory = ({ active = false, onClick }: WorkflowAuxiliaryPanelTriggerProps) => {
  return (
    <Tooltip content="运行历史" side="bottom">
      <Button
        type="button"
        variant="outline"
        size="icon-sm"
        className={iconBtnClass}
        aria-label="运行历史"
        aria-controls="workflow-auxiliary-panel"
        aria-expanded={active}
        onClick={onClick}
      >
        <Clock3 className="size-4" aria-hidden />
      </Button>
    </Tooltip>
  )
}
