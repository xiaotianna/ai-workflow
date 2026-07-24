import { createNodeDefinition } from '../../node/create-node-definition'
import { DATA_TYPE_KINDS } from '../../port/data-types'
import { BuiltinNodeType } from '../builtin-node-types'

export const endNodeDefinition = createNodeDefinition({
  type: BuiltinNodeType.END,
  label: '输出',
  description: '接收上游结果并结束工作流',
  icon: BuiltinNodeType.END,
  inputPort: {
    id: 'result',
    label: '最终结果',
    description: '工作流最终返回的结果',
    dataType: DATA_TYPE_KINDS.JSON,
    required: true,
    multiple: true,
  },
  // end节点是终点，不再向下游输出
  outputPort: false,
})
