import { defineNode, field, pluginSchema as s } from '@ai-workflow/plugin'

export const visualBuilderNode = defineNode({
  key: 'visual-builder',
  label: '可视化构建器',
  description: 'Remote configRenderer：自定义配置面板与主题预览',
  icon: './assets/icon.svg',

  config: {
    schemaVersion: 1,
    schema: s.object({
      theme: s.enum(['aurora', 'sunset', 'forest', 'mono'] as const),
      primaryColor: s.string({ minLength: 4 }),
      secondaryColor: s.string({ minLength: 4 }),
      showGrid: s.boolean(),
      caption: s.string({ minLength: 1 }),
      errorHandling: s.errorHandling(),
    }),
    initial: {
      theme: 'aurora',
      primaryColor: '#6366f1',
      secondaryColor: '#ec4899',
      showGrid: true,
      caption: '拖拽变量或调整主题，预览会实时更新',
      errorHandling: { mode: 'none' },
    },
    form: {
      errorHandling: field.errorHandling({
        label: '异常处理',
        required: true,
      }),
    },
  },

  ports: {
    inputs: {
      source: { label: '数据源', dataType: 'json' },
    },
    outputs: {
      styled: { label: '样式输出', dataType: 'json' },
    },
  },

  ui: {
    node: {
      custom: false,
      content: { entry: './src/ui/visual-builder-content.tsx' },
    },
    form: {
      custom: true,
      renderer: { entry: './src/ui/visual-builder-config-renderer.tsx' },
    },
  },

  execution: { kind: 'none' },
})
