import { Button } from '@ai-workflow/ui/components/button'
import { Clock3 } from 'lucide-react'
import { iconBtnClass } from './icon-button-class'

export const RunHistory = () => {
  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="icon-sm"
        className={iconBtnClass}
        aria-label="运行历史"
      >
        <Clock3 className="size-4" aria-hidden />
      </Button>
    </>
  )
}
