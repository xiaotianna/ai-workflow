import { MessageSquare } from 'lucide-react'
import { chatNodeSchema } from './node-schema'
import { NodeDefinition } from '../../node/node-definition'
import { WorkflowDataTypeKind, WorkflowFieldUIType, WorkflowNodeType } from '../../node/enums'

export const chatNodeDefinition: NodeDefinition<typeof chatNodeSchema> = {
  type: WorkflowNodeType.CHAT,
  label: 'Chat',
  description: '调用大模型生成文本',
  icon: MessageSquare,

  ports: {
    inputs: {
      // 接受上游节点的值
      prompt: {
        dataType: {
          kind: WorkflowDataTypeKind.STRING,
        },
        label: 'Prompt',
        required: true,
        description: '发送给模型的用户提示词',
      },
    },

    outputs: {
      // 输出给下游节点的值
      text: {
        dataType: {
          kind: WorkflowDataTypeKind.STRING,
        },
        label: 'Text',
        required: true,
        description: '模型生成的文本结果',
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
