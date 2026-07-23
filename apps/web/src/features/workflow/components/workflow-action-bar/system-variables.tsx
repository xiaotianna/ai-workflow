import { Button } from '@ai-workflow/ui/components/button'
import { iconBtnClass } from './icon-button-class'
import { cn } from '@ai-workflow/ui/lib/utils'
import Icon from './icon/system-icon.svg'

export const SystemVariables = () => {
  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className={cn(iconBtnClass, 'h-8 w-auto px-2.5 text-xs font-semibold tracking-wide')}
        aria-label="系统变量"
      >
        <img src={Icon} className="size-4" />
      </Button>
    </>
  )
}
