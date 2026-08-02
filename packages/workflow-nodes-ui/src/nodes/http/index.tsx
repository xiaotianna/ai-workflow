import type { HttpNodeConfig } from '@ai-workflow/core'

import { NodeContentItem } from '../../components/node-content-item'
import type { NodeRendererProps } from '../../contracts/node-content'
import { ErrorHandlingNode } from '../error-handling/error-handling-node'

export function HttpNodeContent(props: NodeRendererProps<HttpNodeConfig>) {
  const { node } = props

  return (
    <ErrorHandlingNode {...props}>
      <NodeContentItem
        content={
          <div className="flex min-w-0 items-center gap-1">
            <span className="bg-background flex h-4 shrink-0 items-center rounded-sm px-1 text-xs font-semibold uppercase">
              {node.config.method}
            </span>
            <span title={node.config.url} className="min-w-0 flex-1 truncate text-[11px] leading-3">
              {node.config.url}
            </span>
          </div>
        }
      />
    </ErrorHandlingNode>
  )
}
