import { defineNode, field, pluginSchema as s } from '@ai-workflow/plugin'

export const exampleNode = defineNode({
  key: 'example',
  label: '示例节点',
  description: '返回配置中的示例消息',
  icon: './assets/icon.svg',

  config: {
    schemaVersion: 1,
    schema: s.object({
      message: s.string({ minLength: 1 }),
    }),
    initial: {
      message: 'Hello AI Workflow',
    },
    form: {
      message: field.text({
        label: '消息',
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
    kind: 'none',
  },
})
