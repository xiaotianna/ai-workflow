import type { WorkflowDefinition, WorkflowLayout } from '@/utils/workflow-draft'

export interface WorkflowDraftVo {
  schemaVersion: number
  revision: number
  definition: WorkflowDefinition
  layout: WorkflowLayout
  updatedAt: Date
}
