import type { WorkflowEditorSnapshot } from '@/components/workflow/types'

/**
 * 为指定应用创建一份空白工作流文档。
 * appId 只用于描述归属，Workflow.id 始终单独生成。
 */
export function createEmptyWorkflowDocument(appId: string): WorkflowEditorSnapshot {
  const workflowId = crypto.randomUUID()

  return {
    workflow: {
      id: workflowId,
      name: '未命名工作流',
      description: `应用 ${appId} 的工作流`,
      nodes: [],
      edges: [],
      outputs: [],
    },
    layout: {
      positions: {},
    },
  }
}
