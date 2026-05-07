import type { WorkflowDataType } from '../types/workflow-data-type'

// 端口定义
export interface PortDefinition {
  // 上游的值
  dataType: WorkflowDataType
  // 是否必填
  required?: boolean
  // 是否支持多连接
  multiple?: boolean
  label?: string
  description?: string
}
