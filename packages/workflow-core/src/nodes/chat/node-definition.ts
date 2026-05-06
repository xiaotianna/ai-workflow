import { MessageSquare } from 'lucide-react'
import { WorkflowFieldUIType, WorkflowNodeType } from '../../types/node'
import { NodeDefinition } from '../../types/node/node-definition'
import { chatNodeSchema } from './node-schema'

export const chatNodeDefinition: NodeDefinition<typeof chatNodeSchema> = {
  type: WorkflowNodeType.CHAT,
  label: 'Chat',
  description: '调用大模型生成文本',
  icon: MessageSquare,

  ports: {
    inputs: {
      // 接受上游节点的值
      prompt: {
        type: 'string',
      },
    },

    outputs: {
      // 输出给下游节点的值
      text: {
        type: 'string',
        label: 'Text',
      },
    },
  },

  form: {
    prompt: {
      type: 'string',
      label: 'Prompt',
      required: true,
      ui: WorkflowFieldUIType.INPUT,
      description: '发送给模型的用户提示词',
    },

    systemMessage: {
      type: 'string',
      label: 'System Message',
      ui: WorkflowFieldUIType.TEXTAREA,
      default: '',
      description: '系统提示词',
    },

    model: {
      type: 'select',
      label: 'Model',
      ui: WorkflowFieldUIType.SELECT,
      default: 'gpt-4.1-mini',
      options: [
        { label: 'GPT-4.1', value: 'gpt-4.1' },
        { label: 'GPT-4.1 Mini', value: 'gpt-4.1-mini' },
        { label: 'DeepSeek Chat', value: 'deepseek-chat' },
      ],
    },

    temperature: {
      type: 'number',
      label: 'Temperature',
      ui: WorkflowFieldUIType.SLIDER,
      default: 0.7,
      description: '控制输出随机性，范围 0 - 2',
    },
  },

  schema: chatNodeSchema,
}
