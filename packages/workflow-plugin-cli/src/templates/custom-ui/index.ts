import { createCommonTemplateFiles, createPluginIndex } from '../shared'
import type { PluginTemplateFactory } from '../types'

export const createCustomUiTemplate: PluginTemplateFactory = (context) => [
  ...createCommonTemplateFiles(context, {
    template: 'custom-ui',
    description: '在 Schema 表单基础上增加 React 节点内容组件，并声明 web:execute 权限。',
    react: true,
  }),
  {
    path: 'src/index.ts',
    content: createPluginIndex(context, { permissions: ['web:execute'] }),
  },
  {
    path: 'src/nodes/example.ts',
    content: `import { defineNode, field, pluginSchema as s } from '@ai-workflow/plugin'

export const exampleNode = defineNode({
  key: 'example',
  label: '自定义 UI 示例',
  description: '使用插件提供的 React 内容区',
  icon: './assets/icon.svg',

  config: {
    schemaVersion: 1,
    schema: s.object({
      message: s.string({ minLength: 1 }),
    }),
    initial: {
      message: 'Hello custom UI',
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

  ui: {
    node: {
      custom: false,
      content: {
        entry: './src/ui/example-content.tsx',
      },
    },
    form: {
      custom: false,
    },
  },

  execution: {
    kind: 'none',
  },
})
`,
  },
  {
    path: 'src/ui/example-content.tsx',
    content: `import {
  NodeContentItem,
  NodeContentList,
  type PluginNodeContentProps,
} from '@ai-workflow/plugin/ui'

interface ExampleConfig {
  readonly message: string
}

export default function ExampleContent({ node }: PluginNodeContentProps<ExampleConfig>) {
  return (
    <NodeContentList>
      <NodeContentItem content={node.config.message} />
    </NodeContentList>
  )
}
`,
  },
]
