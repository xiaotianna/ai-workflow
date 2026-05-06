import { Play } from 'lucide-react'
import { WorkflowNodeType } from '../../types/node'
import { NodeDefinition } from '../../types/node/node-definition'
import { startNodeSchema } from './node-schema'

export const startNodeDefinition: NodeDefinition<typeof startNodeSchema> = {
  type: WorkflowNodeType.START,
  label: 'Start',
  description: '工作流开始节点，用于声明工作流输入变量',
  icon: Play,
  ports: {
    inputs: {},
    outputs: {
      variables: {
        type: 'string',
        label: 'Variables',
        description: '开始节点定义的输入变量集合',
      },
    },
  },
  form: {},
  schema: startNodeSchema,
}
