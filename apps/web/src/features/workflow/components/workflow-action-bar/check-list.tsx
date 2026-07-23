import { Button } from '@ai-workflow/ui/components/button'
import { iconBtnClass } from './icon-button-class'
import { cn } from '@ai-workflow/ui/lib/utils'
import { ListTodo } from 'lucide-react'

export const CheckList = () => {
  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="icon-sm"
        className={cn(iconBtnClass, 'relative')}
        aria-label="检查清单"
      >
        <ListTodo className="size-4" aria-hidden />
        <span className="absolute -top-1 -right-1 flex size-4 items-center justify-center rounded-full bg-orange-400 text-[10px] leading-none font-medium text-white">
          6
        </span>
      </Button>
    </>
  )
}
