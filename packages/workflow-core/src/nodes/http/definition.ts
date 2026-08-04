import { createNodeDefinition } from '../../node/create-node-definition'
import { DATA_TYPE_KINDS } from '../../port/data-types'
import { BuiltinNodeType } from '../builtin-node-types'
import { HTTP_RESPONSE_OUTPUT_KEY } from './outputs'

export const httpNodeDefinition = createNodeDefinition({
  type: BuiltinNodeType.HTTP,
  label: 'HTTP 请求',
  description: '向外部服务发送 HTTP 请求并返回标准化响应',
  icon: BuiltinNodeType.HTTP,
  inputPort: {
    id: 'input',
    label: '输入',
    description: '接收上游节点的执行结果',
    dataType: DATA_TYPE_KINDS.JSON,
    required: true,
  },
  outputPort: {
    id: HTTP_RESPONSE_OUTPUT_KEY,
    label: '响应',
    description: '包含状态码、响应头、响应数据和耗时',
    dataType: DATA_TYPE_KINDS.JSON,
    multiple: true,
  },
})
