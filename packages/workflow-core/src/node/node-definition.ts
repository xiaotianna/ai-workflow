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

// 初始化node数据定义
/**
 * 创建新节点时的初始表单数据
 * 使用固定的初始配置，通过initialConfig配置传入
 * 示例：
 * {
    schema: startNodeSchema,
    definition: startNodeDefinition,
    initialConfig: { inputs: xxx }
 * }
 */
interface StaticInitialConfig<TSchema extends z.ZodTypeAny> {
  initialConfig: z.input<TSchema>
  createInitialConfig?: never
}
/**
 * 每次创建节点时生成一份独立的初始配置（根据zod类型自动创建，采用工厂函数）
 * 示例：
 * {
    schema: startNodeSchema,
    definition: startNodeDefinition,
    createInitialConfig: () => ({})
 * }
 */
interface DynamicInitialConfig<TSchema extends z.ZodTypeAny> {
  initialConfig?: never
  createInitialConfig: () => z.input<TSchema>
}

type InitialConfig<TSchema extends z.ZodTypeAny> =
  | StaticInitialConfig<TSchema>
  | DynamicInitialConfig<TSchema>

// 完整的节点定义：配置 Schema + 静态定义
export type NodeType<TSchema extends z.ZodTypeAny = z.ZodTypeAny> = {
  // 节点配置的数据结构与校验规则，可供表单校验，也供后端运行前校验
  schema: TSchema
  // 节点的静态元信息，主要供工作流 UI、端口渲染、节点菜单和连线校验使用
  definition: NodeDefinition
} &
  // initialConfig、createInitialConfig二者只能传入其中一个
  InitialConfig<TSchema>
