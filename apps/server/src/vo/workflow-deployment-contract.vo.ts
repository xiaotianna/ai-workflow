import type { DataType, NodeOutputDefinition } from '@ai-workflow/core'

export interface StudioSubWorkflowOutputVariableVo {
  key: string
  label: string
  dataType: DataType
  description?: string
}

export interface StudioSubWorkflowContractVo {
  workflowId: string
  versionId: string
  version: number
  publishedAt: Date
  inputVariables: NodeOutputDefinition[]
  outputVariables: StudioSubWorkflowOutputVariableVo[]
}
