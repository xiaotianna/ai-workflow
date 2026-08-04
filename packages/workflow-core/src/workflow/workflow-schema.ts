import { z } from 'zod'
import { workflowNodeSchema } from '../node/workflow-node-schema'
import { workflowEdgeSchema } from '../edge/workflow-edge-schema'
import { workflowEnvironmentVariablesSchema } from '../variable/environment-variable'
import { BuiltinNodeType } from '../nodes/builtin-node-types'
import { LLM_FIXED_OUTPUTS } from '../nodes/llm/outputs'
import { normalizeNodeOutputs } from '../node/normalize-node-outputs'
import { workflowOutputsSchema } from './workflow-output-schema'

// 整个工作流实例
export const workflowSchema = z
  .object({
    id: z.string().min(1),
    name: z.string().min(1),
    description: z.string().optional(),
    nodes: z.array(workflowNodeSchema),
    edges: z.array(workflowEdgeSchema),
    outputs: workflowOutputsSchema.default([]),
    environmentVariables: workflowEnvironmentVariablesSchema,
  })
  .transform((workflow) => ({
    ...workflow,
    nodes: workflow.nodes.map((node) =>
      node.type === BuiltinNodeType.LLM
        ? {
            ...node,
            outputs: normalizeNodeOutputs(node.outputs, LLM_FIXED_OUTPUTS),
          }
        : node,
    ),
  }))

export type Workflow = z.infer<typeof workflowSchema>
