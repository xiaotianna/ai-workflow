import type { StartNodeConfig } from '@ai-workflow/core'
import { VariableIcon } from '@ai-workflow/ui/components/variable-icon'

import { NodeContentList } from '../../components/base-node'
import { NodeContentItem } from '../../components/node-content-item'
import type { NodeContentProps } from '../../contracts/node-content'
import { DataTypeIcon } from '../../components/data-type-icon'

export const StartNodeContent = ({ node }: NodeContentProps<StartNodeConfig>) => {
  // 工作流输入会作为 Start 节点的输出提供给下游，因此实际保存在 node.outputs
  const inputVariables = node.outputs

  return (
    <NodeContentList>
      {inputVariables.length > 0 ? (
        inputVariables.map((inputVariable) => (
          <NodeContentItem
            key={inputVariable.key}
            content={
              <div className="flex min-w-0 items-center gap-1">
                <VariableIcon className="text-primary size-3.5" />
                <span
                  title={inputVariable.key}
                  className="text-foreground/80 max-w-20 shrink-0 truncate text-xs font-medium"
                >
                  {inputVariable.key}
                </span>
                <span className="shrink-0 text-xs font-medium" aria-hidden>
                  ·
                </span>
                <span
                  title={inputVariable.label}
                  className="min-w-0 flex-1 truncate text-xs font-medium"
                >
                  {inputVariable.label}
                </span>
                <span
                  className="ml-1 flex w-14 shrink-0 items-center justify-end gap-1.5"
                  aria-label={`类型：${inputVariable.dataType}`}
                >
                  {inputVariable.required ? (
                    <span className="text-xs font-normal">必填</span>
                  ) : null}
                  <DataTypeIcon dataType={inputVariable.dataType} />
                </span>
              </div>
            }
          />
        ))
      ) : (
        <NodeContentItem content={<div className="truncate text-xs">暂未配置输入变量</div>} />
      )}
    </NodeContentList>
  )
}
