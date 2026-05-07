import { z } from 'zod'

import { registerCustomType } from '../registry/data-type-registry'

export const workflowVariableDefinitionSchema = z.object({
  name: z.string(),

  required: z.boolean().optional(),

  defaultValue: z.unknown().optional(),

  dataType: z.any(),
})

export type WorkflowVariableDefinition = z.infer<typeof workflowVariableDefinitionSchema>

/**
 * 注册 builtin custom type
 */
registerCustomType('workflow-variable-definition', workflowVariableDefinitionSchema, {
  description: '工作流变量定义',
})
