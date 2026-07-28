import type { ConditionNodeConfig } from '@ai-workflow/core'
import { NodeContentList } from '../../components/base-node'
import { NodeContentItem } from '../../components/node-content-item'
import type { NodeContentProps } from '../../contracts/node-content'

export function ConditionNodeContent({ node }: NodeContentProps<ConditionNodeConfig>) {
  const conditions = node.config.conditions

  return (
    <NodeContentList>
      {conditions.map((condition) => (
        <NodeContentItem
          key={condition.portId}
          content={
            <>
              <div className="truncate text-xs font-medium">{condition.conditionLabel}</div>

              {!condition.isFallback && condition.condition && (
                <div className="mt-0.5 truncate font-mono text-[11px]">{condition.condition}</div>
              )}
            </>
          }
        />
      ))}
    </NodeContentList>
  )
}
