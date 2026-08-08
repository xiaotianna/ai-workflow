import { defineNode, field, pluginSchema as s } from '@ai-workflow/plugin'

export const richCardNode = defineNode({
  key: 'rich-card',
  label: '富文本卡片',
  description: 'Remote content：渐变卡片 + 状态徽章 + 实时预览',
  icon: './assets/icon.svg',

  config: {
    schemaVersion: 1,
    schema: s.object({
      headline: s.string({ minLength: 1 }),
      subtitle: s.string({ minLength: 1 }),
      status: s.enum(['draft', 'review', 'live'] as const),
      accent: s.enum(['indigo', 'emerald', 'amber', 'rose'] as const),
    }),
    initial: {
      headline: 'Remote UI 已连接',
      subtitle: '这是插件 content 渲染区，运行在宿主共享 React 上下文',
      status: 'live',
      accent: 'indigo',
    },
    form: {
      headline: field.text({ label: '标题', required: true }),
      subtitle: field.textarea({ label: '副标题', required: true }),
      status: field.select({
        label: '状态',
        options: [
          { label: '草稿', value: 'draft' },
          { label: '审核中', value: 'review' },
          { label: '已上线', value: 'live' },
        ],
      }),
      accent: field.select({
        label: '强调色',
        options: [
          { label: 'Indigo', value: 'indigo' },
          { label: 'Emerald', value: 'emerald' },
          { label: 'Amber', value: 'amber' },
          { label: 'Rose', value: 'rose' },
        ],
      }),
    },
  },

  ports: {
    inputs: {
      payload: { label: '输入', dataType: 'json' },
    },
    outputs: {
      result: { label: '输出', dataType: 'json' },
    },
  },

  ui: {
    node: {
      custom: false,
      content: { entry: './src/ui/rich-card-content.tsx' },
    },
    form: { custom: false },
  },

  execution: { kind: 'none' },
})
