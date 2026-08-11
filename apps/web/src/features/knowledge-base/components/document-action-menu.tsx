import { Button } from '@ai-workflow/ui/components/button'
import { DropdownMenu, DropdownMenuTrigger } from '@ai-workflow/ui/components/dropdown-menu'
import { MoreHorizontal } from 'lucide-react'

import { ActionMenuContent, type ActionMenuAction } from '@/components/action-menu-content'

interface DocumentActionMenuProps {
  title: string
  actions: readonly ActionMenuAction[]
  disabled?: boolean
}

export function DocumentActionMenu({ title, actions, disabled = false }: DocumentActionMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label={`${title} 的更多操作`}
          className="text-muted-foreground hover:bg-muted focus-visible:bg-muted aria-expanded:bg-button-secondary-bg-active group-hover/row:[&:hover]:bg-button-secondary-bg-active group-hover/row:focus-visible:bg-button-secondary-bg-active group-hover/row:aria-expanded:bg-button-secondary-bg-active"
          disabled={disabled || !actions.length}
        >
          <MoreHorizontal aria-hidden className="size-4" />
        </Button>
      </DropdownMenuTrigger>

      {actions.length ? <ActionMenuContent actions={actions} sideOffset={6} /> : null}
    </DropdownMenu>
  )
}
