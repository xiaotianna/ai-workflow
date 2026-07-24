import { createNodeDefinition } from '../../node/create-node-definition'
import { DATA_TYPE_KINDS } from '../../port/data-types'
import { BuiltinNodeType } from '../builtin-node-types'

export const conditionNodeDefinition = createNodeDefinition({
  type: BuiltinNodeType.CONDITION,
  label: '条件分支',
  description: '根据条件将工作流路由到不同分支',
  icon: BuiltinNodeType.CONDITION,
  // 左侧handler只有一个端点，叫做entry
  inputPort: {
    id: 'entry',
    label: '入口',
    dataType: DATA_TYPE_KINDS.JSON,
    required: true,
    multiple: true,
  },
  // 右侧handler由conditions动态生成（index.ts的resolvePorts动态解析生成）
  outputPort: false,
})
