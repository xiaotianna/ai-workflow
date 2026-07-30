import { Tooltip } from '@/components/tooltip'
import { Button } from '@ai-workflow/ui/components/button'
import { VariableIcon } from '@ai-workflow/ui/components/variable-icon'
import { iconBtnClass } from './icon-button-class'
import { cn } from '@ai-workflow/ui/lib/utils'

export const SystemVariables = () => {
  return (
    <Tooltip content="系统变量" side="bottom">
      <Button
        type="button"
        variant="outline"
        size="sm"
        className={cn(iconBtnClass, 'h-8 w-auto px-2.5 text-xs font-semibold tracking-wide')}
        aria-label="系统变量"
      >
        <VariableIcon />
      </Button>
    </Tooltip>
  )
}
