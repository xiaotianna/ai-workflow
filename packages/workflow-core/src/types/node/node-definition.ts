import { z } from 'zod'
import { LucideIcon, LucideProps } from 'lucide-react'
import { WorkflowDataType } from '../workflow/node'
import { NodeFieldDefinition } from '../field'

// 端口定义
export interface PortDefinition {
  // 上游的值
  type: WorkflowDataType
  // 是否必填
  required?: boolean
  // 是否支持多连接
  multiple?: boolean
  label?: string
  description?: string
}

export interface NodeDefinition<TSchema extends z.ZodTypeAny = z.ZodTypeAny> {
  type: string
  label: string
  description?: string
  icon: LucideIcon | React.ComponentType<LucideProps>

  // 输入输出端口
  ports: {
    inputs: Record<string, PortDefinition>
    outputs: Record<string, PortDefinition>
  }

  // 表单配置
  form?: Record<string, NodeFieldDefinition>

  schema: TSchema
}
