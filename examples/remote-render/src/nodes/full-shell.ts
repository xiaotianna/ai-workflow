import { defineNode, pluginSchema as s } from '@ai-workflow/plugin'

export const fullShellNode = defineNode({
  key: 'full-shell',
  label: '全自定义外壳',
  description: 'Remote renderer：完整接管节点外壳、端口与拖拽',
  icon: './assets/icon.svg',

  config: {
    schemaVersion: 1,
    schema: s.object({
      banner: s.string({ minLength: 1 }),
      mode: s.enum(['compact', 'expanded'] as const),
      highlight: s.boolean(),
    }),
    initial: {
      banner: 'Custom Renderer Active',
      mode: 'expanded',
      highlight: true,
    },
    form: {},
  },

  ports: {
    inputs: {
      in: { label: '输入' },
    },
    outputs: {
      out: { label: '输出' },
      error: { label: '异常', dataType: 'json' },
    },
  },

  ui: {
    node: {
      custom: true,
      renderer: { entry: './src/ui/full-shell-renderer.tsx' },
    },
    form: { custom: false },
  },

  execution: { kind: 'none' },
})
