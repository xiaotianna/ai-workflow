import type { ComponentProps, RefObject } from 'react'
import { AddNodeButton } from '@ai-workflow/nodes-ui'
import { Button } from '@ai-workflow/ui/components/button'
import { OpenAIPanel } from './open-ai-panel'
import { ToolbarTooltip } from './toolbar-tooltip'
import { cn } from '@ai-workflow/ui/lib/utils'
import { Redo2, Undo2 } from 'lucide-react'

export const WorkflowToolbarGroup = ({ className, ...props }: ComponentProps<'div'>) => (
  <div
    role="group"
    className={cn(
      'nodrag nopan nowheel border-border bg-background/95',
      'flex items-center gap-1 rounded-xl border-[0.5px] p-1',
      'shadow-xs backdrop-blur-[5px]',
      className,
    )}
    {...props}
  />
)

interface WorkflowCanvasToolbarProps {
  addNodeButtonRef: RefObject<HTMLButtonElement | null>
  disabled?: boolean
  addNodeOpen: boolean
  canRedo: boolean
  canUndo: boolean
  onAddNodeOpenChange: (open: boolean) => void
  onRedo: () => void
  onUndo: () => void
}

export const WorkflowCanvasToolbar = ({
  addNodeButtonRef,
  disabled = false,
  addNodeOpen,
  canRedo,
  canUndo,
  onAddNodeOpenChange,
  onRedo,
  onUndo,
}: WorkflowCanvasToolbarProps) => {
  return (
    <fieldset
      disabled={disabled}
      aria-label="工作流画布操作"
      className="relative m-0 -ml-21 min-w-0 border-0 p-0"
    >
      <WorkflowToolbarGroup aria-label="历史操作" className="absolute top-0 right-full mr-2">
        <ToolbarTooltip label="撤销" shortcut={['⌘', 'Z']}>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label="撤销"
            aria-keyshortcuts="Meta+Z Control+Z"
            disabled={!canUndo}
            onClick={onUndo}
          >
            <Undo2 className="size-4" aria-hidden />
          </Button>
        </ToolbarTooltip>
        <ToolbarTooltip label="重做" shortcut={['⇧', '⌘', 'Z']}>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label="重做"
            aria-keyshortcuts="Meta+Shift+Z Control+Shift+Z Control+Y"
            disabled={!canRedo}
            onClick={onRedo}
          >
            <Redo2 className="size-4" aria-hidden />
          </Button>
        </ToolbarTooltip>
      </WorkflowToolbarGroup>

      <WorkflowToolbarGroup aria-label="添加节点">
        <AddNodeButton
          ref={addNodeButtonRef}
          aria-expanded={addNodeOpen}
          onClick={() => onAddNodeOpenChange(!addNodeOpen)}
        />
      </WorkflowToolbarGroup>

      <WorkflowToolbarGroup aria-label="AI 操作" className="absolute top-0 left-full ml-2">
        <OpenAIPanel />
      </WorkflowToolbarGroup>
    </fieldset>
  )
}
