import type { DataType, StartNodeConfig } from '@ai-workflow/core'
import { VariableIcon } from '@ai-workflow/ui/components/variable-icon'
import { Braces, Hash, SquareCheck, TypeOutline, type LucideIcon } from 'lucide-react'
import { NodeContentList } from '../../components/base-node'
import { NodeContentItem } from '../../components/node-content-item'
import type { NodeContentProps } from '../../contracts/node-content'

const DATA_TYPE_ICONS = {
  string: TypeOutline,
  number: Hash,
  boolean: SquareCheck,
  json: Braces,
} satisfies Record<DataType, LucideIcon>

function DataTypeIcon({ dataType }: { dataType: DataType }) {
  const Icon = DATA_TYPE_ICONS[dataType]

  return <Icon className="size-3.5 shrink-0" aria-hidden />
}

export const StartNodeContent = ({ node }: NodeContentProps<StartNodeConfig>) => {
  const outputs = node.outputs

  return (
    <NodeContentList>
      {outputs.length > 0 ? (
        outputs.map((output) => (
          <NodeContentItem
            key={output.key}
            content={
              <div className="flex min-w-0 items-center gap-1">
                <VariableIcon className="text-primary size-3.5" />
                <span
                  title={output.key}
                  className="text-foreground/80 max-w-20 shrink-0 truncate text-xs font-medium"
                >
                  {output.key}
                </span>
                <span className="shrink-0 text-xs font-medium" aria-hidden>
                  ·
                </span>
                <span title={output.label} className="min-w-0 flex-1 truncate text-xs font-medium">
                  {output.label}
                </span>
                <span
                  className="ml-1 flex w-14 shrink-0 items-center justify-end gap-1.5"
                  aria-label={`类型：${output.dataType}`}
                >
                  {output.required ? <span className="text-xs font-normal">必填</span> : null}
                  <DataTypeIcon dataType={output.dataType} />
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
