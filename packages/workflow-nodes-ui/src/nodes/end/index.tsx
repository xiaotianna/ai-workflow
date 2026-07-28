import type { EndNodeConfig } from '@ai-workflow/core'
import { NodeContentList } from '../../components/base-node'
import type { NodeContentProps } from '../../contracts/node-content'

export function EndNodeContent({ node }: NodeContentProps<EndNodeConfig>) {
  const inputs = Object.entries(node.inputs)

  return (
    <NodeContentList>
      <div className="space-y-3">
        <div className="flex items-center justify-between rounded-md bg-slate-100/80 px-2.5 py-2">
          <span className="truncate text-sm text-slate-700">输出变量</span>
          <span className="shrink-0 text-xs font-medium text-slate-500">{inputs.length} 个</span>
        </div>

        {inputs.length > 0 ? (
          inputs.map(([key]) => (
            <div key={key} className="truncate text-xs text-slate-600">
              {key}
            </div>
          ))
        ) : (
          <div className="text-xs text-slate-400">暂未配置输出变量</div>
        )}
      </div>
    </NodeContentList>
  )
}
