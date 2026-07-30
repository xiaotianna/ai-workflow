import { Tooltip } from '@/components/tooltip'
import { Button } from '@ai-workflow/ui/components/button'
import { iconBtnClass } from './icon-button-class'
import { cn } from '@ai-workflow/ui/lib/utils'
import Icon from './icon/env-icon.svg'

export const EnvVariables = () => {
  return (
    <Tooltip content="环境变量" side="bottom">
      <Button
        type="button"
        variant="outline"
        size="sm"
        className={cn(iconBtnClass, 'h-8 w-auto px-2.5 text-xs font-semibold tracking-wide')}
        aria-label="环境变量"
      >
        <img src={Icon} className="size-4" />
      </Button>
    </Tooltip>
  )
}
