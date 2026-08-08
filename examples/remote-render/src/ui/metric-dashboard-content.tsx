import { NodeContentList, type PluginNodeContentProps } from '@ai-workflow/plugin/ui'

import { MetricGrid, MetricTile } from '../components/metric-tile'
import { GradientBadge } from '../components/visual-kit'

interface MetricDashboardConfig {
  readonly primaryLabel: string
  readonly primaryValue: string
  readonly primaryDelta: string
  readonly secondaryLabel: string
  readonly secondaryValue: string
  readonly secondaryDelta: string
  readonly trend: 'up' | 'down' | 'flat'
}

export default function MetricDashboardContent({
  node,
}: PluginNodeContentProps<MetricDashboardConfig>) {
  const config = node.config

  return (
    <NodeContentList>
      <div className="space-y-2">
        <GradientBadge label="Remote Metrics" tone="indigo" />
        <MetricGrid>
          <MetricTile
            label={config.primaryLabel}
            value={config.primaryValue}
            delta={config.primaryDelta}
            trend={config.trend}
          />
          <MetricTile
            label={config.secondaryLabel}
            value={config.secondaryValue}
            delta={config.secondaryDelta}
            trend="flat"
          />
        </MetricGrid>
        <p className="text-muted-foreground text-[11px] leading-4">
          修改右侧表单字段，指标面板会随 config 热更新。
        </p>
      </div>
    </NodeContentList>
  )
}
