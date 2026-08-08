import { createCommonTemplateFiles, createPluginIndex } from '../shared'
import type { PluginTemplateFactory } from '../types'

export const createExecutorTemplate: PluginTemplateFactory = (context) => [
  ...createCommonTemplateFiles(context, {
    template: 'executor',
    description: '声明 sandbox-js Executor，演示第三方节点执行模块的标准结构。',
  }),
  { path: 'src/index.ts', content: createPluginIndex(context, {}) },
  {
    path: 'src/nodes/example.ts',
    content: `import { defineNode, field, pluginSchema as s } from '@ai-workflow/plugin'

export const exampleNode = defineNode({
  key: 'example',
  label: 'Executor 示例',
  description: '由 sandbox-js Executor 生成输出',
  icon: './assets/icon.svg',

  config: {
    schemaVersion: 1,
    schema: s.object({
      message: s.string({ minLength: 1 }),
    }),
    initial: {
      message: 'Hello Executor',
    },
    form: {
      message: field.text({
        label: '默认消息',
        required: true,
      }),
    },
  },

  ports: {
    inputs: {
      input: { label: '输入' },
    },
    outputs: {
      output: { label: '输出' },
    },
  },

  execution: {
    kind: 'sandbox-js',
    entry: './src/executor.ts',
  },
})
`,
  },
  {
    path: 'src/executor.ts',
    content: `import { defineExecutor } from '@ai-workflow/plugin/executor'

export default defineExecutor(({ config, inputs, signal }) => {
  if (signal.aborted) throw new Error('Executor 已取消')

  return {
    outputs: {
      output: inputs.input ?? config.message,
    },
  }
})
`,
  },
]
