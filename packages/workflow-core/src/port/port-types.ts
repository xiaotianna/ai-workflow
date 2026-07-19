import { DataType } from './data-types'

// 端口定义
export interface PortDefinition {
  // 上游的值
  readonly dataType: DataType
  // 是否必填
  readonly required?: boolean
  // 是否支持多连接
  readonly multiple?: boolean
  readonly label?: string
  readonly description?: string
}

/**
 * 示例：
 * outputs: {
        text: {
            label: 'Text',
            dataType: 'string',
        },
    }
    这里的 `text` 直接对应 `edge.sourceHandle`
 */
export type PortMap = Readonly<Record<string, PortDefinition>>
