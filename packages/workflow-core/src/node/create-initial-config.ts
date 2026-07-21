import type { z } from 'zod'

/**
 * 工厂函数：用于创建节点的初始配置，支持传入部分初始值
 * 作用于：nodes/xx节点/index.ts
    1、使用 Schema 默认值：
        createInitialConfig: () => createInitialConfig(startNodeSchema)
    2、传入部分节点默认值：
        createInitialConfig: () => createInitialConfig(startNodeSchema, {
            variables: [],
        })
 *
 */
export function createInitialConfig<TSchema extends z.ZodTypeAny>(
  schema: TSchema,
  initialValue: Partial<z.input<TSchema>> = {},
): z.output<TSchema> {
  return schema.parse(initialValue)
}
