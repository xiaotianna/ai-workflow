import { defineConfig } from '@ai-workflow/plugin'

import { executableModelNode } from './nodes/executable-model'
import { fullShellNode } from './nodes/full-shell'
import { hostLlmNode } from './nodes/host-llm'
import { metricDashboardNode } from './nodes/metric-dashboard'
import { richCardNode } from './nodes/rich-card'
import { visualBuilderNode } from './nodes/visual-builder'

export default defineConfig({
  displayName: 'Remote Render 测试包',
  description: '覆盖 Remote UI、宿主模型选择字段和本地插件 Executor',
  hostVersionRange: '^1.0.0',
  permissions: ['web:execute'],
  requires: {
    hostFields: ['llm_model'],
  },
  nodes: [
    richCardNode,
    metricDashboardNode,
    fullShellNode,
    visualBuilderNode,
    executableModelNode,
    hostLlmNode,
  ],
})
