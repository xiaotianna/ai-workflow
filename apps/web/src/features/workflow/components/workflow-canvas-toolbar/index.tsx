import type { ComponentProps } from 'react'
import { AddNode } from './add-node'
import { OpenAIPanel } from './open-ai-panel'
import { cn } from '@ai-workflow/ui/lib/utils'
import type { NodeType } from '@ai-workflow/core'

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
  nodeTypes: readonly NodeType[]
  onAddNode: (type: string) => void
}

export const WorkflowCanvasToolbar = ({ nodeTypes, onAddNode }: WorkflowCanvasToolbarProps) => {
  return (
    <WorkflowToolbarGroup aria-label="运行操作">
      {/* 添加节点按钮 */}
      <AddNode nodeTypes={nodeTypes} onAddNode={onAddNode} />
      {/* 打开ai面板 */}
      <OpenAIPanel />
    </WorkflowToolbarGroup>
  )
}
