import type { HttpNodeConfig } from '@ai-workflow/core'

import { NodeContentList } from '../../components/base-node'
import { NodeContentItem } from '../../components/node-content-item'
import type { NodeContentProps } from '../../contracts/node-content'

export function HttpNodeContent({ node }: NodeContentProps<HttpNodeConfig>) {
  return (
    <NodeContentList>
      <NodeContentItem
        content={
          <div className="flex min-w-0 items-center gap-1">
            <span className="bg-background text-muted-foreground flex h-4 shrink-0 items-center rounded-sm px-1 text-xs font-semibold uppercase">
              {node.config.method}
            </span>
            <span
              title={node.config.url}
              className="text-foreground min-w-0 flex-1 truncate text-[11px] leading-3"
            >
              {node.config.url}
            </span>
          </div>
        }
      />
    </NodeContentList>
  )
}
