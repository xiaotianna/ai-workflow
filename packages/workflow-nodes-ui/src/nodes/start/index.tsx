import { StartNodeConfig } from '@ai-workflow/core'
import { NodeContentProps } from '../../contracts/node-content'

export const StartNodeContent = ({ config }: NodeContentProps<StartNodeConfig>) => {
  const variables = config.variables
  return (
    <>
      <div className="space-y-2">
        <div className="flex items-center justify-between rounded-md bg-slate-100/80 px-2.5 py-2">
          <span className="truncate text-sm text-slate-700">输入变量</span>
          <span className="shrink-0 text-xs font-medium text-slate-500">{variables.length} 个</span>
        </div>

        {variables.map((variable) => (
          <div key={variable.key} className="flex items-center justify-between text-xs">
            <span className="truncate text-slate-600">{variable.label}</span>
            <span className="text-slate-400">{variable.dataType}</span>
          </div>
        ))}
      </div>
    </>
  )
}
