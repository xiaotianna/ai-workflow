import type { StartNodeConfig } from '@ai-workflow/core'
import { NodeContentList } from '../../components/base-node'
import type { NodeContentProps } from '../../contracts/node-content'

export const StartNodeContent = ({ node, definition }: NodeContentProps<StartNodeConfig>) => {
  const outputs = node.outputs

  return (
    <NodeContentList>
      <div className="space-y-3">
        {definition.description?.trim() ? (
          <p className="text-xs text-slate-500">{definition.description}</p>
        ) : null}

        <div className="flex items-center justify-between rounded-md bg-slate-100/80 px-2.5 py-2">
          <span className="truncate text-sm text-slate-700">输出变量</span>
          <span className="shrink-0 text-xs font-medium text-slate-500">{outputs.length} 个</span>
        </div>

        {outputs.length > 0 ? (
          outputs.map((output) => (
            <div key={output.key} className="flex items-center justify-between text-xs">
              <span className="truncate text-slate-600">{output.label}</span>
              <span className="text-slate-400">{output.dataType}</span>
            </div>
          ))
        ) : (
          <div className="text-xs text-slate-400">暂未配置输出变量</div>
        )}
      </div>
    </NodeContentList>
  )
}
