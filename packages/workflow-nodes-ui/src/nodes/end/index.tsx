import type { EndNodeConfig } from '@ai-workflow/core'
import { VariableIcon } from '@ai-workflow/ui/components/variable-icon'

import { NodeContentList } from '../../components/base-node'
import { NodeContentItem } from '../../components/node-content-item'
import type { NodeContentProps } from '../../contracts/node-content'

export function EndNodeContent({ node }: NodeContentProps<EndNodeConfig>) {
  // End 的输出值来自直接值或上游变量绑定，因此实际保存在 node.inputs。
  const outputKeys = Object.keys(node.inputs)

  if (outputKeys.length === 0) {
    return null
  }

  return (
    <NodeContentList>
      {outputKeys.map((outputKey) => (
        <NodeContentItem
          key={outputKey}
          content={
            <div className="flex min-w-0 items-center gap-1">
              <VariableIcon className="text-primary size-3.5" />
              <span
                title={outputKey}
                className="text-foreground/80 min-w-0 flex-1 truncate text-xs font-medium"
              >
                {outputKey}
              </span>
            </div>
          }
        />
      ))}
    </NodeContentList>
  )
}
