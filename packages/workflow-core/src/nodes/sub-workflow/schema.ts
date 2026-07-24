import { z } from 'zod'

export const subWorkflowNodeSchema = z.object({
  workflowId: z.string().trim().min(1, '请选择子工作流')
})

export type SubWorkflowNodeConfig = z.output<typeof subWorkflowNodeSchema>
