import { defineNode, field, pluginSchema as s } from '@ai-workflow/plugin'

export const executableModelNode = defineNode({
  key: 'executable-model',
  label: '模型配置回显',
  description: '可执行节点：验证宿主模型选择器与本地插件 Executor',
  icon: './assets/icon.svg',

  config: {
    schemaVersion: 1,
    schema: s.object({
      model: s.json(),
      prompt: s.string({ minLength: 1 }),
    }),
    initial: {
      model: {
        groupId: '',
        configuredModelId: '',
        parameters: {},
      },
      prompt: '请回显当前选择的模型配置和节点输入',
    },
    form: {
      model: field.host({
        type: 'llm_model',
        label: '模型',
        description: '选择一个已配置的对话模型，用于验证宿主模型选择字段',
        required: true,
      }),
      prompt: field.textarea({
        label: '测试提示词',
        description: 'Executor 会将提示词和模型配置一起写入输出',
        required: true,
      }),
    },
  },

  ports: {
    inputs: {
      input: { label: '测试输入', dataType: 'json' },
    },
    outputs: {
      response: { label: '响应', dataType: 'json' },
    },
  },

  fixedOutputs: [
    {
      key: 'response',
      label: '响应',
      dataType: 'json',
      description: '插件 Executor 返回的模型配置、节点输入和运行上下文',
    },
  ],

  execution: {
    kind: 'sandbox-js',
    entry: './src/executors/model-inspector.ts',
  },
})
