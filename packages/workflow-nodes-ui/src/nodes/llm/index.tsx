import type { LlmNodeConfig } from '@ai-workflow/core'
import { Badge } from '@ai-workflow/ui/components/badge'

import { NodeContentItem } from '../../components/node-content-item'
import type { NodeRendererProps } from '../../contracts/node-content'
import { ErrorHandlingNode } from '../error-handling/error-handling-node'

export function LlmNodeContent({
  node,
  resolveModelReferenceDisplay,
  ...props
}: NodeRendererProps<LlmNodeConfig>) {
  const modelReference = node.config.model,
    hasModelReference = Boolean(modelReference.groupId || modelReference.configuredModelId),
    modelDisplay = resolveModelReferenceDisplay?.(modelReference)

  let content = <p className="text-xs leading-4">未选择模型</p>

  if (hasModelReference && !modelDisplay) {
    content = <p className="text-xs leading-4">已配置模型（待刷新展示信息）</p>
  } else if (modelDisplay) {
    content = (
      <div className="flex min-w-0 items-center gap-1.5">
        <span
          aria-hidden
          className="text-foreground flex size-5 shrink-0 items-center justify-center [&>svg]:size-4"
        >
          {modelDisplay.providerIcon}
        </span>
        <span title={modelDisplay.modelName} className="min-w-0 flex-1 truncate text-xs leading-4">
          {modelDisplay.modelName}
        </span>
        <Badge
          variant="outline"
          className="text-muted-foreground h-5 shrink-0 rounded-md px-1.5 text-[10px]"
        >
          CHAT
        </Badge>
      </div>
    )
  }

  return (
    <ErrorHandlingNode
      {...props}
      node={node}
      resolveModelReferenceDisplay={resolveModelReferenceDisplay}
    >
      <NodeContentItem content={content} />
    </ErrorHandlingNode>
  )
}
