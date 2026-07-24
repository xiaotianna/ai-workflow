import { createInitialConfig } from '../../node/create-initial-config'
import type { NodeType } from '../../node/node-definition'
import { subWorkflowNodeDefinition } from './definition'
import { subWorkflowNodeSchema } from './schema'

export const subWorkflowNode = {
  schema: subWorkflowNodeSchema,
  definition: subWorkflowNodeDefinition,
  createInitialConfig: () =>
    createInitialConfig(subWorkflowNodeSchema, {
      workflowId: ''
    })
} satisfies NodeType<typeof subWorkflowNodeSchema>

export type { SubWorkflowNodeConfig } from './schema'
