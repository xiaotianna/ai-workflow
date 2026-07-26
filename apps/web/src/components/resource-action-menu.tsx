import { Button } from '@ai-workflow/ui/components/button'
import { DropdownMenu, DropdownMenuTrigger } from '@ai-workflow/ui/components/dropdown-menu'
import { SlidersHorizontal } from 'lucide-react'

import { ActionMenuContent, type ActionMenuAction } from '@/components/action-menu-content'

interface ResourceActionMenuProps {
  title: string
  actions: readonly ActionMenuAction[]
}

export function ResourceActionMenu({ title, actions }: ResourceActionMenuProps) {
  if (!actions.length) {
    return <span className="size-8 shrink-0" aria-hidden />
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label={`${title} 的更多操作`}
          className="text-muted-foreground -mt-1 self-start"
        >
          <SlidersHorizontal aria-hidden className="size-4" strokeWidth={2} />
        </Button>
      </DropdownMenuTrigger>

      <ActionMenuContent actions={actions} sideOffset={6} />
    </DropdownMenu>
  )
}
