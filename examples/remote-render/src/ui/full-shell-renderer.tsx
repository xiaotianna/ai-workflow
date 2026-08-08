import { BaseNode, NodeContentList, type PluginNodeRendererProps } from '@ai-workflow/plugin/ui'

import { GradientBadge, PreviewPanel, cn } from '../components/visual-kit'

interface FullShellConfig {
  readonly banner: string
  readonly mode: 'compact' | 'expanded'
  readonly highlight: boolean
}

export default function FullShellRenderer({
  node,
  definition,
  ports,
  selected,
  disabled,
  onSelect,
  onDelete,
  renderPort,
  dragHandleClassName,
  executionStatus,
}: PluginNodeRendererProps<FullShellConfig>) {
  const { banner, mode, highlight } = node.config
  const isExpanded = mode === 'expanded'

  return (
    <div
      className={cn(
        'relative',
        highlight &&
          'rounded-2xl bg-gradient-to-r from-indigo-500 via-fuchsia-500 to-amber-400 p-[2px]',
      )}
    >
      <BaseNode
        nodeId={node.id}
        definition={definition}
        ports={ports}
        selected={selected}
        disabled={disabled}
        onSelect={onSelect}
        onDelete={onDelete}
        renderPort={renderPort}
        executionStatus={executionStatus}
      >
        <div className={cn('px-1 pb-1', dragHandleClassName)}>
          <NodeContentList>
            <div className={cn('space-y-2', !isExpanded && 'max-h-24 overflow-hidden')}>
              <div className="flex flex-wrap items-center gap-2">
                <GradientBadge label="Full Renderer" tone="rose" />
                <GradientBadge label={isExpanded ? 'Expanded' : 'Compact'} tone="amber" />
              </div>
              <PreviewPanel
                title={banner}
                subtitle="renderer 模式：插件返回完整 NodeRenderer，宿主不再包裹 BaseNode"
                accentClassName="from-rose-500/15 via-fuchsia-500/10 to-indigo-500/5"
                footer={`${Object.keys(ports.inputs).length} 入 · ${Object.keys(ports.outputs).length} 出`}
              />
              {isExpanded ? (
                <div className="border-border/60 bg-muted/30 grid grid-cols-3 gap-1 rounded-lg border p-2">
                  {['Alpha', 'Beta', 'Gamma'].map((slot) => (
                    <div
                      key={slot}
                      className="bg-background/80 text-muted-foreground rounded-md px-2 py-3 text-center text-[10px] font-medium"
                    >
                      {slot}
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          </NodeContentList>
        </div>
      </BaseNode>
    </div>
  )
}
