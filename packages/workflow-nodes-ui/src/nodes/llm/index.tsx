import type { LlmNodeConfig } from '@ai-workflow/core'

import { NodeContentList } from '../../components/base-node'
import { NodeContentItem } from '../../components/node-content-item'
import type { NodeContentProps } from '../../contracts/node-content'

export function LlmNodeContent({
  node,
  resolveModelReferenceDisplay,
}: NodeContentProps<LlmNodeConfig>) {
  const modelReference = node.config.model
  const hasModelReference = Boolean(modelReference.groupId || modelReference.configuredModelId)
  const modelDisplay = resolveModelReferenceDisplay?.(modelReference)

  let content = <p className="text-xs leading-4">未选择模型</p>

  if (hasModelReference && !resolveModelReferenceDisplay) {
    content = <p className="text-xs leading-4">正在加载模型信息...</p>
  } else if (hasModelReference && !modelDisplay) {
    content = <p className="text-xs leading-4">已配置模型不可用</p>
  } else if (modelDisplay) {
    content = (
      <div className="flex min-w-0 items-center gap-2">
        <span
          aria-hidden
          className="text-foreground flex size-5 shrink-0 items-center justify-center [&>svg]:size-4"
        >
          {modelDisplay.providerIcon}
        </span>
        <div className="min-w-0 flex-1">
          <p title={modelDisplay.groupName} className="truncate text-[10px] leading-3">
            {modelDisplay.groupName}
          </p>
          <p
            title={modelDisplay.modelName}
            className="text-foreground truncate text-xs leading-4 font-medium"
          >
            {modelDisplay.modelName}
          </p>
        </div>
      </div>
    )
  }

  return (
    <NodeContentList>
      <NodeContentItem content={content} />
    </NodeContentList>
  )
}
