import { PortMap } from '../port/port-types'
import type { z } from 'zod'

// 节点定义
export interface NodeDefinition {
  type: string
  label: string
  description?: string
  // icon如果在map中没有注册，就渲染成img
  icon?: string
  // 节点颜色
  theme?: string

  // 输入输出端口
  ports: {
    inputs: PortMap
    outputs: PortMap
  }
}

// 完整的节点定义：配置 Schema + 静态定义
export interface NodeType<TSchema extends z.ZodType = z.ZodType<any, any>> {
  // 节点配置的数据结构与校验规则，可供表单校验，也供后端运行前校验
  schema: TSchema
  // 节点的静态元信息，主要供工作流 UI、端口渲染、节点菜单和连线校验使用
  definition: NodeDefinition
  /**
   * 每次创建节点时生成一份独立的初始配置（根据zod类型自动创建，采用工厂函数）
   * 示例：
   * {
      schema: startNodeSchema,
      definition: startNodeDefinition,
      createInitialConfig: () => ({})
  * }
  */
  createInitialConfig: () => z.input<TSchema>
  // 根据节点实例config生成动态端口，针对于像【条件节点】这样需要动态节点端口的情况，没有动态端口的节点不需要实现
  resolvePorts?: (config: z.output<TSchema>) => NodeDefinition['ports']
}

// 用来获得NodeType上的schema类型
export type InferNodeConfig<TNode extends NodeType> = z.output<TNode['schema']>
