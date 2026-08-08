import { defineNode, field, pluginSchema as s } from '@ai-workflow/plugin'

export const metricDashboardNode = defineNode({
  key: 'metric-dashboard',
  label: '指标面板',
  description: 'Remote content：KPI 网格与趋势指示',
  icon: './assets/icon.svg',

  config: {
    schemaVersion: 1,
    schema: s.object({
      primaryLabel: s.string({ minLength: 1 }),
      primaryValue: s.string({ minLength: 1 }),
      primaryDelta: s.string({ minLength: 1 }),
      secondaryLabel: s.string({ minLength: 1 }),
      secondaryValue: s.string({ minLength: 1 }),
      secondaryDelta: s.string({ minLength: 1 }),
      trend: s.enum(['up', 'down', 'flat'] as const),
    }),
    initial: {
      primaryLabel: 'Remote 加载',
      primaryValue: '128 ms',
      primaryDelta: '12%',
      secondaryLabel: 'UI 注册',
      secondaryValue: '4/4',
      secondaryDelta: 'OK',
      trend: 'up',
    },
    form: {
      primaryLabel: field.text({ label: '主指标名', required: true }),
      primaryValue: field.text({ label: '主指标值', required: true }),
      primaryDelta: field.text({ label: '主指标变化', required: true }),
      secondaryLabel: field.text({ label: '副指标名', required: true }),
      secondaryValue: field.text({ label: '副指标值', required: true }),
      secondaryDelta: field.text({ label: '副指标变化', required: true }),
      trend: field.select({
        label: '趋势',
        options: [
          { label: '上升', value: 'up' },
          { label: '下降', value: 'down' },
          { label: '持平', value: 'flat' },
        ],
      }),
    },
  },

  ports: {
    inputs: {
      metrics: { label: '指标输入', dataType: 'json' },
    },
    outputs: {
      snapshot: { label: '快照', dataType: 'json' },
    },
  },

  ui: {
    node: {
      custom: false,
      content: { entry: './src/ui/metric-dashboard-content.tsx' },
    },
    form: { custom: false },
  },

  execution: { kind: 'none' },
})
