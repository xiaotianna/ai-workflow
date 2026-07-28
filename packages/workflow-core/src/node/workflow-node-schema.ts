import { z } from 'zod'
import { DATA_TYPE_VALUES } from '../port/data-types'
import { variableValueSchema } from '../variable/variable-value-schema'

type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue }

const jsonValueSchema: z.ZodType<JsonValue, JsonValue> = z.lazy(() =>
  z.union([
    z.string(),
    z.number().finite(),
    z.boolean(),
    z.null(),
    z.array(jsonValueSchema),
    z.record(z.string(), jsonValueSchema),
  ]),
)

// 每个节点通用的输入变量绑定，值可以直接填写，也可以引用上游节点的输出变量
export const nodeInputBindingsSchema = z
  .record(z.string().trim().min(1, '输入变量名不能为空'), variableValueSchema)
  .default({})

// 节点对外公开的输出变量定义，dataType只描述变量，不再限制画布连线
export const nodeOutputDefinitionSchema = z
  .object({
    key: z
      .string()
      .trim()
      .min(1, '输出变量名不能为空')
      .regex(/^[a-zA-Z_]\w*$/, '输出变量名格式不正确'),
    label: z.string().trim().min(1, '输出变量显示名称不能为空'),
    dataType: z.enum(DATA_TYPE_VALUES),
    description: z.string().trim().optional(),
    defaultValue: jsonValueSchema.optional(),
    required: z.boolean().optional(),
  })
  .superRefine((output, context) => {
    if (output.defaultValue === undefined) return

    const matchesDataType =
      (output.dataType === 'string' && typeof output.defaultValue === 'string') ||
      (output.dataType === 'number' && typeof output.defaultValue === 'number') ||
      (output.dataType === 'boolean' && typeof output.defaultValue === 'boolean') ||
      output.dataType === 'json'

    if (!matchesDataType) {
      context.addIssue({
        code: 'custom',
        path: ['defaultValue'],
        message: '默认值与变量类型不匹配',
      })
    }
  })

export const nodeOutputDefinitionsSchema = z
  .array(nodeOutputDefinitionSchema)
  .default([])
  .superRefine((outputs, context) => {
    const keys = new Set<string>()

    outputs.forEach((output, index) => {
      if (keys.has(output.key)) {
        context.addIssue({
          code: 'custom',
          path: [index, 'key'],
          message: `节点输出变量不能重复：${output.key}`,
        })
      }
      keys.add(output.key)
    })
  })

/**
 * 工作流中实际保存的节点实例，是前端传递的的内容，获取到前端配置进行校验，大致思路如下：
const workflowNode: WorkflowNode = {
  id: 'chat-1',
  type: 'chat',
  inputs: {},
  outputs: [],
  config: {
    prompt: '你好',
  },
}
const nodeType = registry.getOrThrow(workflowNode.type)
const config = nodeType.schema.parse(workflowNode.config)

与 workflow/workflow-schema.ts的区别：
- workflowNodeSchema：校验一个节点
- workflowSchema：校验一整个工作流
*/
export const workflowNodeSchema = z.object({
  id: z.string().min(1, '节点 ID 不能为空'),
  type: z.string().min(1, '节点类型不能为空'),
  // 节点实例可覆盖类型定义中的默认名称和描述
  label: z.string().trim().min(1, '节点名称不能为空').optional(),
  description: z.string().trim().optional(),
  // 当前节点使用的变量
  inputs: nodeInputBindingsSchema,
  // 节点输出变量
  outputs: nodeOutputDefinitionsSchema,
  /**
   * 节点配置
   * 这里只做通用约束，具体配置由对应节点的 schema 参数的校验
   * xxNode.config获取到的是nodeType定义的schema，该config是实际的数据对象
   * 实际执行前需要使用：
   * chatNode.schema.parse(node.config) -> schema.parse由zod提供，可以用safeParse
   */
  config: z.record(z.string(), z.unknown()).default({}),
  // 节点所属的父容器节点id，当前仅用于表示loop内的子节点，值为对应loop节点的id
  parentId: z.string().min(1).optional(),
})

export type WorkflowNode = z.infer<typeof workflowNodeSchema>
export type NodeInputBindings = z.output<typeof nodeInputBindingsSchema>
export type NodeInputBindingsInput = z.input<typeof nodeInputBindingsSchema>
export type NodeOutputDefinition = z.output<typeof nodeOutputDefinitionSchema>
export type NodeOutputDefinitionInput = z.input<typeof nodeOutputDefinitionSchema>
