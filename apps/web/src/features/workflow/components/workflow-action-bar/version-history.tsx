import { Button } from '@ai-workflow/ui/components/button'
import { iconBtnClass } from './icon-button-class'
import { History } from 'lucide-react'

export const VersionHistory = () => {
  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="icon-sm"
        className={iconBtnClass}
        aria-label="版本历史"
      >
        <History className="size-4" aria-hidden />
      </Button>
    </>
  )
}
