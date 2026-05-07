import { Play } from 'lucide-react'
import { startNodeSchema } from './node-schema'
import { NodeDefinition } from '../../node/node-definition'
import { WorkflowDataTypeKind, WorkflowNodeType } from '../../node/enums'

export const startNodeDefinition: NodeDefinition<typeof startNodeSchema> = {
  type: WorkflowNodeType.START,
  label: 'Start',
  description: '工作流开始节点，用于声明工作流输入变量',
  icon: Play,
  ports: {
    inputs: {},
    outputs: {
      variables: {
        dataType: {
          kind: WorkflowDataTypeKind.ARRAY,
          itemType: {
            kind: WorkflowDataTypeKind.CUSTOM,
            typeName: 'workflow-variable-definition',
          },
        },
        label: 'Variables',
        description: '开始节点定义的输入变量集合',
      },
    },
  },
  form: {},
  schema: startNodeSchema,
}
