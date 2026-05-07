import { Play } from 'lucide-react'
import { startNodeSchema } from './node-schema'
import { NodeDefinition } from '../../node/node-definition'
import { WorkflowDataTypeKind, WorkflowFieldUIType, WorkflowNodeType } from '../../node/enums'
import { BuiltinCustomTypeName } from '../../constant'

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
            typeName: BuiltinCustomTypeName.WORKFLOW_VARIABLE_DEFINITION,
          },
        },
        label: 'Variables',
        description: '开始节点定义的输入变量集合',
      },
    },
  },
  form: {
    variables: {
      kind: 'schema',
      schemaFieldType: BuiltinCustomTypeName.WORKFLOW_VARIABLE_DEFINITION,
      label: 'Variables',
      ui: WorkflowFieldUIType.SCHEMA_EDITOR,
      default: [],
      description: '在工作流开始时声明输入变量，变量可以在后续节点中使用',
    },
  },
  schema: startNodeSchema,
}
