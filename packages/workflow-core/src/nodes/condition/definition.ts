import type { NodeDefinition } from '../../node/node-definition'
import { DATA_TYPE_KINDS } from '../../port/data-types'
import { BuiltinNodeType } from '../builtin-node-types'

export const conditionNodeDefinition = {
  type: BuiltinNodeType.CONDITION,
  label: '条件分支',
  description: '根据条件将工作流路由到不同分支',
  icon: BuiltinNodeType.CONDITION,
  ports: {
    // 左侧handler只有一个端点，叫做entry
    inputs: {
      entry: {
        label: '入口',
        dataType: DATA_TYPE_KINDS.JSON,
        required: true,
        multiple: true,
      },
    },
    // 右侧handler由conditions动态生成
    outputs: {},
  },
} satisfies NodeDefinition
