import { Tooltip } from '@/components/tooltip'
import { Button } from '@ai-workflow/ui/components/button'
import { iconBtnClass } from './icon-button-class'
import { History } from 'lucide-react'
import type { WorkflowAuxiliaryPanelTriggerProps } from './types'

export const VersionHistory = ({ active = false, onClick }: WorkflowAuxiliaryPanelTriggerProps) => {
  return (
    <Tooltip content="版本" side="bottom">
      <Button
        type="button"
        variant="outline"
        size="icon-sm"
        className={iconBtnClass}
        aria-label="版本历史"
        aria-controls="workflow-auxiliary-panel"
        aria-expanded={active}
        onClick={onClick}
      >
        <History className="size-4" aria-hidden />
      </Button>
    </Tooltip>
  )
}
