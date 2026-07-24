import { DATA_TYPE_KINDS } from './data-types'
import { PortDefinition } from './port-types'

// 普通节点默认输入handle id
export const DEFAULT_INPUT_PORT_ID = 'input'
// 输出handle id
export const DEFAULT_OUTPUT_PORT_ID = 'result'

// 输入端口配置
export const DEFAULT_INPUT_PORT = {
  label: '输入',
  dataType: DATA_TYPE_KINDS.JSON,
  required: true,
} satisfies PortDefinition

// 输出端口配置
/**
 * 例如：llm-1.result.text，也可以是http-1.response.data
 */
export const DEFAULT_OUTPUT_PORT = {
  label: '输出',
  dataType: DATA_TYPE_KINDS.JSON,
  required: true,
} satisfies PortDefinition
