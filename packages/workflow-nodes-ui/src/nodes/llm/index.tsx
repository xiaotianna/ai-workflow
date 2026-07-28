import type { LlmNodeConfig } from '@ai-workflow/core'

import { NodeContentList } from '../../components/base-node'
import { NodeContentItem } from '../../components/node-content-item'
import type { NodeContentProps } from '../../contracts/node-content'

export function LlmNodeContent({ node }: NodeContentProps<LlmNodeConfig>) {
  const prompt = node.config.prompt

  return (
    <NodeContentList>
      <NodeContentItem
        content={
          <p
            title={prompt}
            className="line-clamp-3 text-xs leading-4 wrap-break-word whitespace-pre-wrap"
          >
            {prompt}
          </p>
        }
      />
    </NodeContentList>
  )
}
