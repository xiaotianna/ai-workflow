import { z } from 'zod'
import { variableReferenceSchema } from './variable-reference-schema'

/**
 * 文件统一变量值的定义，包括用户输入的变量，引用的节点、系统或env变量
 * 1、type: 'value'：保存输入框直接填写的值
 *  {
      type: 'value',
      value: '张三',
    }
   2、type: 'reference'：保存变量引用，例如：user-1.result.name
    {
      type: 'reference',
      reference: {
        scope: 'node',
        nodeId: 'user-1',
        outputKey: 'result',
        path: ['name'],
      },
    }
 */
export const variableValueSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('value'),
    value: z.unknown(),
  }),
  z.object({
    type: z.literal('reference'),
    reference: variableReferenceSchema,
  }),
])

export type VariableValue = z.output<typeof variableValueSchema>
export type VariableValueInput = z.input<typeof variableValueSchema>
