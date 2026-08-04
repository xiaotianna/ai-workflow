import { createNodeDefinition } from '../../node/create-node-definition'
import { DATA_TYPE_KINDS } from '../../port/data-types'
import { BuiltinNodeType } from '../builtin-node-types'

export const loopNodeDefinition = createNodeDefinition({
  type: BuiltinNodeType.LOOP,
  label: '循环',
  description: '重复执行容器内部的节点',
  icon: BuiltinNodeType.LOOP,
  inputPort: {
    id: 'input',
    label: '循环输入',
    dataType: DATA_TYPE_KINDS.JSON,
    required: true,
  },
  outputPort: {
    id: 'result',
    label: '循环结果',
    dataType: DATA_TYPE_KINDS.JSON,
    multiple: true,
  },
})

export const LOOP_FIXED_OUTPUTS = [
  {
    key: 'result',
    label: '循环结果',
    dataType: DATA_TYPE_KINDS.JSON,
    description: '最后一轮 Loop Exit 收集到的输入',
  },
] as const
