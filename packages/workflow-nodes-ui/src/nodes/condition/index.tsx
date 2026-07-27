import type { ConditionNodeConfig } from '@ai-workflow/core'
import type { NodeContentProps } from '../../contracts/node-content'

export function ConditionNodeContent({ node }: NodeContentProps<ConditionNodeConfig>) {
  const conditions = node.config.conditions

  return (
    <div className="space-y-1.5">
      {conditions.map((condition) => (
        <div key={condition.portId} className="rounded-md bg-slate-50 px-2 py-1.5">
          <div className="truncate text-xs font-medium text-slate-700">
            {condition.conditionLabel}
          </div>

          {!condition.isFallback && condition.condition && (
            <div className="mt-0.5 truncate font-mono text-[11px] text-slate-400">
              {condition.condition}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
