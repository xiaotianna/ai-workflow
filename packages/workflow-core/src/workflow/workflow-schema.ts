import { z } from 'zod'
import { workflowNodeSchema } from '../node/workflow-node-schema'
import { workflowEdgeSchema } from '../edge/workflow-edge-schema'
import { workflowEnvironmentVariablesSchema } from '../variable/environment-variable'
import { workflowOutputsSchema } from './workflow-output-schema'

// 整个工作流实例
export const workflowSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional(),
  nodes: z.array(workflowNodeSchema),
  edges: z.array(workflowEdgeSchema),
  outputs: workflowOutputsSchema.default([]),
  environmentVariables: workflowEnvironmentVariablesSchema,
})

export type Workflow = z.infer<typeof workflowSchema>
