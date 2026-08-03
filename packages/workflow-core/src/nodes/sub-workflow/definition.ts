import { createNodeDefinition } from '../../node/create-node-definition'
import { DATA_TYPE_KINDS } from '../../port/data-types'
import { BuiltinNodeType } from '../builtin-node-types'

export const subWorkflowNodeDefinition = createNodeDefinition({
  type: BuiltinNodeType.SUB_WORKFLOW,
  label: '子工作流',
  description: '调用另一个工作流，并暴露其公开输出供下游使用',
  icon: BuiltinNodeType.SUB_WORKFLOW,
  inputPort: {
    id: 'input',
    label: '输入',
    dataType: DATA_TYPE_KINDS.JSON,
    required: true,
  },
  outputPort: {
    id: 'result',
    label: '执行结果',
    dataType: DATA_TYPE_KINDS.JSON,
    multiple: true,
  },
})
