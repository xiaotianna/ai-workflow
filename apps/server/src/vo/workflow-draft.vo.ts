import type { WorkflowLayout } from '@/utils/workflow-draft'
import type { Workflow } from '@ai-workflow/core'

export interface WorkflowDraftVo {
  schemaVersion: number
  revision: number
  definition: Workflow
  layout: WorkflowLayout
  updatedAt: Date
}
