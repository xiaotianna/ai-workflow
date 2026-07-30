import { ContextMenu } from 'radix-ui'
import type { ReactElement } from 'react'

import type {
  WorkflowContextMenuActionStrategy,
  WorkflowContextMenuStrategyContext,
} from '../workflow-context-menu-registry'
import { WorkflowContextMenuContent } from './workflow-context-menu-content'

interface WorkflowContextMenuProps {
  actions: readonly WorkflowContextMenuActionStrategy[]
  children: ReactElement
  context?: WorkflowContextMenuStrategyContext
  disabled?: boolean
  instanceKey: number
  keepOpen?: boolean
  onAction: (
    action: WorkflowContextMenuActionStrategy,
    anchorPosition?: { x: number; y: number },
  ) => void
  onOpenChange: (open: boolean) => void
}

export function WorkflowContextMenu({
  actions,
  children,
  context,
  disabled = false,
  instanceKey,
  keepOpen = false,
  onAction,
  onOpenChange,
}: WorkflowContextMenuProps) {
  if (disabled) return children

  function handleOpenChange(nextOpen: boolean) {
    onOpenChange(nextOpen)
  }

  return (
    <ContextMenu.Root key={instanceKey} modal={false} onOpenChange={handleOpenChange}>
      <ContextMenu.Trigger
        asChild
        onContextMenu={(event) => {
          const target = event.target

          if (
            !(target instanceof Element) ||
            !target.closest('.react-flow__node, .react-flow__pane') ||
            target.closest('.react-flow__panel')
          ) {
            event.preventDefault()
          }
        }}
      >
        <div className="contents">{children}</div>
      </ContextMenu.Trigger>
      <WorkflowContextMenuContent
        actions={actions}
        context={context}
        keepOpen={keepOpen}
        onAction={onAction}
      />
    </ContextMenu.Root>
  )
}
