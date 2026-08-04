import type { NodeDefinition } from '@ai-workflow/core'
import { cn } from '@ai-workflow/ui/lib/utils'
import { CircleCheck, CircleX, LoaderCircle } from 'lucide-react'
import type { ReactNode } from 'react'

import { getNodeThemeColor } from '../../common/node-theme-map'
import type { NodeExecutionStatus } from '../../contracts/node-content'
import { NodeIcon } from '../node-icon'

export interface NodeHeaderProps {
  definition: NodeDefinition
  label?: ReactNode
  actions?: ReactNode
  onDelete?: () => void
  className?: string
  executionStatus?: NodeExecutionStatus
  executionDetail?: ReactNode
}

// 统一渲染节点头部，完整节点渲染器可以通过className适配自身布局
export function NodeHeader({
  definition,
  label,
  actions,
  onDelete,
  className,
  executionStatus,
  executionDetail,
}: NodeHeaderProps) {
  return (
    <header className={cn('flex items-center justify-between p-3', className)}>
      <div className="flex min-w-0 flex-1 items-center">
        <span
          className="text-primary-foreground mr-2 flex size-6 shrink-0 items-center justify-center rounded-[0.5rem] shadow-md"
          style={{ backgroundColor: getNodeThemeColor(definition.type) }}
        >
          <NodeIcon icon={definition.icon} className="size-4" aria-hidden />
        </span>

        <div className="min-w-0 flex-1">
          {label ?? (
            <div className="text-foreground truncate text-sm font-semibold">{definition.label}</div>
          )}
        </div>
      </div>

      {executionStatus || executionDetail || actions || onDelete ? (
        <div className="ml-3 flex shrink-0 items-center gap-2">
          {executionDetail}
          {executionStatus ? <NodeExecutionStatusIcon status={executionStatus} /> : null}
          {actions}
          {onDelete ? (
            <button
              type="button"
              aria-label={`删除${definition.label}节点`}
              onClick={(event) => {
                event.stopPropagation()
                onDelete()
              }}
              className="text-muted-foreground hover:text-destructive cursor-pointer text-xs transition-colors"
            >
              删除
            </button>
          ) : null}
        </div>
      ) : null}
    </header>
  )
}

function NodeExecutionStatusIcon({ status }: { status: NodeExecutionStatus }) {
  if (status === 'RUNNING') {
    return (
      <span role="img" aria-label="节点运行中" title="运行中" className="text-info">
        <LoaderCircle className="size-5 animate-spin motion-reduce:animate-none" aria-hidden />
      </span>
    )
  }

  if (status === 'SUCCEEDED') {
    return (
      <span
        role="img"
        aria-label="节点运行成功"
        title="运行成功"
        className="text-workflow-node-success"
      >
        <CircleCheck className="size-5" aria-hidden />
      </span>
    )
  }

  return (
    <span
      role="img"
      aria-label="节点运行失败"
      title="运行失败"
      className="text-workflow-node-failed"
    >
      <CircleX className="size-5" aria-hidden />
    </span>
  )
}
