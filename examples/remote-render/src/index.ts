import { defineConfig } from '@ai-workflow/plugin'

import { fullShellNode } from './nodes/full-shell'
import { metricDashboardNode } from './nodes/metric-dashboard'
import { richCardNode } from './nodes/rich-card'
import { visualBuilderNode } from './nodes/visual-builder'

export default defineConfig({
  displayName: 'Remote Render 测试包',
  description: '覆盖 content / renderer / configRenderer 三种 Remote UI 模式',
  hostVersionRange: '^1.0.0',
  permissions: ['web:execute'],
  nodes: [richCardNode, metricDashboardNode, fullShellNode, visualBuilderNode],
})
