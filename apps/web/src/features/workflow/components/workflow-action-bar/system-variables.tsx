import { Tooltip } from '@/components/tooltip'
import { Button } from '@ai-workflow/ui/components/button'
import { VariableIcon } from '@ai-workflow/ui/components/variable-icon'
import { iconBtnClass } from './icon-button-class'
import { cn } from '@ai-workflow/ui/lib/utils'
import type { WorkflowAuxiliaryPanelTriggerProps } from './types'

export const SystemVariables = ({
  active = false,
  onClick,
}: WorkflowAuxiliaryPanelTriggerProps) => {
  return (
    <Tooltip content="系统变量" side="bottom">
      <Button
        type="button"
        variant="outline"
        size="sm"
        className={cn(iconBtnClass, 'h-8 w-auto px-2.5 text-xs font-semibold tracking-wide')}
        aria-label="系统变量"
        aria-controls="workflow-auxiliary-panel"
        aria-expanded={active}
        onClick={onClick}
      >
        <VariableIcon />
      </Button>
    </Tooltip>
  )
}
