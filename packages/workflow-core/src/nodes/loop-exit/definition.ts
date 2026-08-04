import { createNodeDefinition } from '../../node/create-node-definition'
import { DATA_TYPE_KINDS } from '../../port/data-types'
import { BuiltinNodeType } from '../builtin-node-types'

export const loopExitNodeDefinition = createNodeDefinition({
  type: BuiltinNodeType.LOOP_EXIT,
  label: '退出循环',
  description: '结束当前轮，并根据终止条件决定是否继续',
  icon: BuiltinNodeType.LOOP_EXIT,
  inputPort: {
    id: 'result',
    label: '退出结果',
    dataType: DATA_TYPE_KINDS.JSON,
    required: true,
    multiple: true,
  },
  outputPort: false,
})
