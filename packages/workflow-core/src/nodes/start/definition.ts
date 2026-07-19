import { NodeDefinition } from '../../node/node-definition'
import { DATA_TYPE_KINDS } from '../../port/data-types'
import { BuiltinNodeType } from '../builtin-node-types'

export const startNodeDefinition = {
  type: BuiltinNodeType.START,
  label: '开始',
  description: '工作流的起始节点',
  icon: 'play',
  ports: {
    // 开始节点没有上游
    inputs: {},
    // 下游通过 output handle 获取输入内容
    outputs: {
      input: {
        label: '初始输入',
        dataType: DATA_TYPE_KINDS.STRING,
        description: '启动工作流时传入的内容',
      },
    },
  },
} satisfies NodeDefinition
