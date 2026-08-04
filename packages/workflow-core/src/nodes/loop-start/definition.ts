import type { NodeDefinition } from '../../node/node-definition'
import { DATA_TYPE_KINDS } from '../../port/data-types'
import { BuiltinNodeType } from '../builtin-node-types'

export const loopStartNodeDefinition = {
  type: BuiltinNodeType.LOOP_START,
  label: '循环开始',
  description: '提供当前循环的输入和次数',
  icon: BuiltinNodeType.LOOP_START,
  ports: {
    inputs: {},
    outputs: {
      input: {
        label: '循环输入',
        description: '输出 Loop 节点接收到的输入',
        dataType: DATA_TYPE_KINDS.JSON,
        multiple: true,
      },
    },
  },
} satisfies NodeDefinition

export const LOOP_START_FIXED_OUTPUTS = [
  {
    key: 'input',
    label: '循环输入',
    dataType: DATA_TYPE_KINDS.JSON,
    description: 'Loop 节点在本轮接收到的输入',
  },
  {
    key: 'iteration',
    label: '循环次数',
    dataType: DATA_TYPE_KINDS.NUMBER,
    description: '从 1 开始的当前循环次数',
  },
] as const
