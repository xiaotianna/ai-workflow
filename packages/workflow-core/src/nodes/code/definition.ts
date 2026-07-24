import { createNodeDefinition } from '../../node/create-node-definition'
import { DATA_TYPE_KINDS } from '../../port/data-types'
import { BuiltinNodeType } from '../builtin-node-types'

export const codeNodeDefinition = createNodeDefinition({
  type: BuiltinNodeType.CODE,
  label: '代码',
  description: '运行自定义代码并返回执行结果',
  icon: BuiltinNodeType.CODE,
  inputPort: {
    id: 'input',
    label: '输入',
    description: '传递给代码的输入数据',
    dataType: DATA_TYPE_KINDS.JSON,
    required: true
  },
  outputPort: {
    id: 'result',
    label: '执行结果',
    description: '代码执行后返回的数据',
    dataType: DATA_TYPE_KINDS.JSON,
    multiple: true
  }
})
