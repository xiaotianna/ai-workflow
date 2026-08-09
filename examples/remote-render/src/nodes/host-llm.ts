import { defineNode, field, pluginSchema as s } from '@ai-workflow/plugin'

export const hostLlmNode = defineNode({
  key: 'host-llm',
  label: '插件 LLM',
  description: '通过插件声明复用宿主的 LLM 执行能力',
  icon: './assets/icon.svg',

  config: {
    schemaVersion: 1,
    schema: s.object({
      model: s.json(),
      messages: s.array(
        s.object({
          id: s.string({ minLength: 1 }),
          role: s.enum(['system', 'assistant', 'user']),
          content: s.string({ minLength: 1 }),
        }),
        { minLength: 1 },
      ),
      errorHandling: s.errorHandling(),
    }),
    initial: {
      model: {
        groupId: '',
        configuredModelId: '',
        parameters: {},
      },
      messages: [
        {
          id: 'plugin-llm-system-message',
          role: 'system',
          content: '请根据输入生成回答',
        },
      ],
      errorHandling: { mode: 'none' },
    },
    form: {
      model: field.host({
        type: 'llm_model',
        label: '模型',
        description: '选择一个由宿主管理的对话模型',
        required: true,
      }),
      messages: field.contextMessages({
        label: '上下文',
        required: true,
      }),
      errorHandling: field.errorHandling({
        label: '异常处理',
        required: true,
      }),
    },
  },

  ports: {
    inputs: {
      input: {
        label: '输入',
        dataType: 'json',
        required: true,
      },
    },
    outputs: {
      result: {
        label: '生成结果',
        dataType: 'string',
        multiple: true,
      },
    },
  },

  fixedOutputs: [
    {
      key: 'result',
      label: '生成结果',
      dataType: 'string',
      description: '模型生成的完整结果',
    },
  ],

  execution: {
    kind: 'host-llm',
  },
})
