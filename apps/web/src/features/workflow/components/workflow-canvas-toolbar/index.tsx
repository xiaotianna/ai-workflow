import type { ComponentProps } from 'react'
import { AddNode } from './add-node'
import { OpenAIPanel } from './open-ai-panel'
import { cn } from '@ai-workflow/ui/lib/utils'

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

export const WorkflowCanvasToolbar = () => {
  return (
    <WorkflowToolbarGroup aria-label="运行操作">
      {/* 添加节点按钮 */}
      <AddNode />
      {/* 打开ai面板 */}
      <OpenAIPanel />
    </WorkflowToolbarGroup>
  )
}
