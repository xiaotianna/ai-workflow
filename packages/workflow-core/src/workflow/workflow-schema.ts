import { z } from 'zod'
import { workflowNodeSchema } from '../node/workflow-node-schema'
import { workflowEdgeSchema } from '../edge/workflow-edge-schema'

export const workflowSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional(),
  nodes: z.array(workflowNodeSchema),
  edges: z.array(workflowEdgeSchema),
})
