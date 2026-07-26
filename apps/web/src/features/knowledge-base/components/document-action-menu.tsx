import { Button } from '@ai-workflow/ui/components/button'
import { DropdownMenu, DropdownMenuTrigger } from '@ai-workflow/ui/components/dropdown-menu'
import { MoreHorizontal } from 'lucide-react'

import { ActionMenuContent, type ActionMenuAction } from '@/components/action-menu-content'

interface DocumentActionMenuProps {
  title: string
  actions: readonly ActionMenuAction[]
}

export function DocumentActionMenu({ title, actions }: DocumentActionMenuProps) {
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
          className="text-muted-foreground"
        >
          <MoreHorizontal aria-hidden className="size-4" />
        </Button>
      </DropdownMenuTrigger>

      <ActionMenuContent actions={actions} sideOffset={6} />
    </DropdownMenu>
  )
}
