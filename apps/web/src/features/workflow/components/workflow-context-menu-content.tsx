import { cn } from '@ai-workflow/ui/lib/utils'
import { ContextMenu } from 'radix-ui'
import { Fragment } from 'react'

import type {
  WorkflowContextMenuActionStrategy,
  WorkflowContextMenuStrategyContext,
} from '../workflow-context-menu-registry'
import { getWorkflowShortcutDefinition } from '../workflow-shortcut-definitions'
import { WorkflowShortcutKeys } from './workflow-shortcut-keys'

interface WorkflowContextMenuContentProps {
  actions: readonly WorkflowContextMenuActionStrategy[]
  context?: WorkflowContextMenuStrategyContext
  keepOpen?: boolean
  onAction: (
    action: WorkflowContextMenuActionStrategy,
    anchorPosition?: { x: number; y: number },
  ) => void
}

export function WorkflowContextMenuContent({
  actions,
  context,
  keepOpen = false,
  onAction,
}: WorkflowContextMenuContentProps) {
  function handleSelect(event: Event, action: WorkflowContextMenuActionStrategy) {
    if (action.keepMenuOpenAfterSelect) {
      event.preventDefault()

      const item = event.currentTarget,
        itemBounds = item instanceof Element ? item.getBoundingClientRect() : undefined
      onAction(action, itemBounds ? { x: itemBounds.right, y: itemBounds.top } : undefined)
      return
    }

    onAction(action)
  }

  return (
    <ContextMenu.Portal>
      <ContextMenu.Content
        aria-label={context?.target.scope === 'node' ? '节点操作' : '画布操作'}
        className="border-border bg-popover/95 text-popover-foreground data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 z-50 min-w-52 overflow-hidden rounded-xl border-[0.5px] p-1 shadow-lg outline-hidden backdrop-blur-[5px] duration-100"
        onCloseAutoFocus={(event) => event.preventDefault()}
        onFocusOutside={(event) => {
          if (keepOpen) event.preventDefault()
        }}
        onPointerDownOutside={(event) => {
          if (keepOpen) event.preventDefault()
        }}
      >
        {actions.map((action, index) => {
          const shortcut = action.shortcutId
              ? getWorkflowShortcutDefinition(action.shortcutId)
              : undefined,
            actionDisabled = context ? (action.isDisabled?.(context) ?? false) : true

          return (
            <Fragment key={action.id}>
              {action.separatorBefore && index > 0 ? (
                <ContextMenu.Separator className="bg-border pointer-events-none -mx-1 my-1 h-px" />
              ) : null}
              <ContextMenu.Item
                disabled={actionDisabled}
                className={cn(
                  'data-highlighted:bg-accent data-highlighted:text-accent-foreground flex min-h-8 cursor-pointer items-center rounded-md px-2 py-1.5 text-sm outline-hidden select-none data-disabled:pointer-events-none data-disabled:cursor-not-allowed data-disabled:opacity-50',
                  action.destructive &&
                    'text-destructive data-highlighted:bg-destructive/10 data-highlighted:text-destructive',
                )}
                onSelect={(event) => handleSelect(event, action)}
              >
                <span>{action.label}</span>
                {shortcut ? (
                  <WorkflowShortcutKeys keys={shortcut.keys.slice(0, 1)} className="ml-auto pl-6" />
                ) : null}
              </ContextMenu.Item>
            </Fragment>
          )
        })}
      </ContextMenu.Content>
    </ContextMenu.Portal>
  )
}
