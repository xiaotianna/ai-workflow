import type { NodeOutputDefinition } from '../../node/workflow-node-schema'
import { DATA_TYPE_KINDS } from '../../port/data-types'

export const HTTP_RESPONSE_OUTPUT_KEY = 'response'

/** HTTP 固定公开的完整响应变量；与同名画布端口没有绑定关系。 */
export const HTTP_FIXED_OUTPUTS = [
  {
    key: HTTP_RESPONSE_OUTPUT_KEY,
    label: '完整响应',
    dataType: DATA_TYPE_KINDS.JSON,
    description: '包含状态码、响应头、响应数据和请求耗时',
  },
] as const satisfies readonly NodeOutputDefinition[]
