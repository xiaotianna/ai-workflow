import { z } from 'zod'
import { systemVariableKeySchema } from './system-variable'

// 变量路径，例如res.data.count，path为：['res', 'data', 'count']
const variablePathSchema = z.array(z.string().trim().min(1)).default([])

// 定义节点的变量引用（一般是输出的变量）
const nodeVariableReferenceSchema = z.object({
  scope: z.literal('node'),
  nodeId: z.string().trim().min(1),
  outputKey: z.string().trim().min(1),
  path: variablePathSchema,
})

// 系统变量的引用
const systemVariableReferenceSchema = z.object({
  scope: z.literal('system'),
  key: systemVariableKeySchema,
  path: variablePathSchema,
})

// 环境变量的引用
const envVariableReferenceSchema = z.object({
  scope: z.literal('env'),
  variableId: z.string().trim().min(1),
  path: variablePathSchema,
})

// 定义变量引用类型（节点的变量、系统变量、环境变量）
export const variableReferenceSchema = z.discriminatedUnion('scope', [
  nodeVariableReferenceSchema,
  systemVariableReferenceSchema,
  envVariableReferenceSchema,
])

export type VariableReference = z.output<typeof variableReferenceSchema>
