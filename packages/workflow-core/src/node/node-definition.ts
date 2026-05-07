import type { z } from 'zod'
import type { LucideIcon, LucideProps } from 'lucide-react'
import type { PortDefinition } from './port-definition'
import { NodeFieldDefinition } from './field-definition'

// 节点定义
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
