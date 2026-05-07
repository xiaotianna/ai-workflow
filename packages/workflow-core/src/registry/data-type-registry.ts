import { z } from 'zod'

export interface RegisteredCustomType {
  typeName: string

  schema: z.ZodTypeAny

  description?: string
}

const customTypeRegistry = new Map<string, RegisteredCustomType>()

// 注册工作流自定义data类型
export function registerCustomType(
  typeName: string,
  schema: z.ZodTypeAny,
  options?: {
    description?: string
  },
) {
  if (customTypeRegistry.has(typeName)) {
    throw new Error(`Custom type "${typeName}" 已注册`)
  }

  customTypeRegistry.set(typeName, {
    typeName,
    schema,
    description: options?.description,
  })
}

// 获取注册的自定义类型
export function getCustomType(typeName: string) {
  const type = customTypeRegistry.get(typeName)

  if (!type) {
    throw new Error(`Custom type "${typeName}" 未注册`)
  }

  return type
}
