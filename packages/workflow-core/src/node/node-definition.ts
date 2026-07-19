import { PortMap } from '../port/port-types'
import type { z } from 'zod'

// 节点定义
export interface NodeDefinition {
  type: string
  label: string
  description?: string
  icon?: string

  // 输入输出端口
  ports: {
    inputs: PortMap
    outputs: PortMap
  }
}

// 完整的节点定义：配置 Schema + 静态定义
export interface NodeType<TSchema extends z.ZodTypeAny = z.ZodTypeAny> {
  // 节点配置的数据结构与校验规则，可供表单校验，也供后端运行前校验
  schema: TSchema
  // 节点的静态元信息，主要供工作流 UI、端口渲染、节点菜单和连线校验使用
  definition: NodeDefinition
  // 创建新节点时的初始表单数据
  initialConfig: z.input<TSchema>
}
