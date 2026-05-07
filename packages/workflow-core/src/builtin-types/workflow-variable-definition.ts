import { z } from 'zod'

import { registerCustomType } from '../registry/data-type-registry'
import { BuiltinCustomTypeName } from '../constant'

export const workflowVariableDefinitionSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  required: z.boolean().optional(),
  defaultValue: z.unknown().optional(),
  dataType: z.any(),
})

export type WorkflowVariableDefinition = z.infer<typeof workflowVariableDefinitionSchema>

/**
 * 注册 builtin custom type
 * @param typeName 需要去 packages/workflow-core/src/constant/index.ts 定义
 */
registerCustomType(
  BuiltinCustomTypeName.WORKFLOW_VARIABLE_DEFINITION,
  workflowVariableDefinitionSchema,
  {
    description: '工作流变量定义',
  },
)
