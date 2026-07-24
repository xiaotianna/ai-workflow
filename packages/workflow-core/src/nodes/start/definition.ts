import { createNodeDefinition } from '../../node/create-node-definition'
import { DATA_TYPE_KINDS } from '../../port/data-types'
import { BuiltinNodeType } from '../builtin-node-types'

/**
手动实现：
export const startNodeDefinition = {
  type: BuiltinNodeType.START,
  label: '开始',
  description: '工作流的起始节点',
  icon: BuiltinNodeType.START,
  ports: {
    // 开始节点没有上游
    inputs: {},
    // 下游通过 output handle 获取输入内容
    outputs: {
      variables: {
        label: '初始变量输入',
        dataType: DATA_TYPE_KINDS.JSON,
        description: '工作流输入变量声明集合',
        multiple: true
      }
    }
  }
} satisfies NodeDefinition
下面的实现和上面的是一致的
 */
export const startNodeDefinition = createNodeDefinition({
  type: BuiltinNodeType.START,
  label: '开始',
  description: '工作流的起始节点',
  icon: BuiltinNodeType.START,
  // 开始节点没有上游
  inputPort: false,
  // 下游通过 output handle 获取输入内容
  outputPort: {
    id: 'variables',
    label: '初始变量输入',
    dataType: DATA_TYPE_KINDS.JSON,
    description: '工作流输入变量声明集合',
    multiple: true,
  },
})
