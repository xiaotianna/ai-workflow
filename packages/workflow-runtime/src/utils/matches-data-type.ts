import { DATA_TYPE_KINDS, type DataType, type JsonValue } from '@ai-workflow/core'

// 校验某次 Runtime 的动态值是否符合 Core `DataType` 元数据，Edge 连线类型不在这里重新校验
export function matchesDataType(value: JsonValue, dataType: DataType): boolean {
  switch (dataType) {
    case DATA_TYPE_KINDS.STRING: {
      return typeof value === 'string'
    }
    case DATA_TYPE_KINDS.NUMBER: {
      return typeof value === 'number'
    }
    case DATA_TYPE_KINDS.BOOLEAN: {
      return typeof value === 'boolean'
    }
    case DATA_TYPE_KINDS.JSON: {
      return true
    }
  }
}
