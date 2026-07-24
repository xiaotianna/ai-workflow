import { z } from 'zod'
import { DATA_TYPE_VALUES } from '../port/data-types'
import { variableValueSchema } from '../variable/variable-value-schema'

// 定义工作流最终输出的变量
const outputVariableSchema = z.object({
  key: z
    .string()
    .trim()
    .min(1, '变量名不能为空')
    .regex(/^[a-zA-Z_]\w*$/, '变量名格式不正确'),
  label: z.string().trim().min(1, '显示名称不能为空'),
  dataType: z.enum(DATA_TYPE_VALUES),
  description: z.string().trim().optional(),
  value: variableValueSchema,
})

// 工作流输出的格式
export const workflowOutputsSchema = z
  .array(outputVariableSchema)
  .superRefine((outputs, context) => {
    const keys = new Set<string>()
    // 校验输出字段名中的字段名不能重复，例如：outputs: [
    //  { key: 'name', ... },
    //  { key: 'age', ... },
    //  { key: 'name', ... }, // 重复
    // ] 是不合法的
    outputs.forEach((output, index) => {
      if (keys.has(output.key)) {
        context.addIssue({
          code: 'custom',
          path: [index, 'key'],
          message: `工作流输出字段不能重复：${output.key}`,
        })
      }
      keys.add(output.key)
    })
  })

export type WorkflowOutputs = z.output<typeof workflowOutputsSchema>
