import type { WorkflowEditorSnapshot } from '@/components/workflow/types'
import { conditionNode, startNode } from '@ai-workflow/core'

/**
 * 为指定应用创建一份本地演示文档。
 * appId 只用于描述归属，Workflow.id 始终单独生成。
 */
export function createDemoWorkflowDocument(appId: string): WorkflowEditorSnapshot {
  const workflowId = crypto.randomUUID()
  const startId = crypto.randomUUID()
  const conditionId = crypto.randomUUID()

  return {
    workflow: {
      id: workflowId,
      name: '未命名工作流',
      description: `应用 ${appId} 的本地演示工作流`,
      nodes: [
        {
          id: startId,
          type: startNode.definition.type,
          config: startNode.createInitialConfig(),
        },
        {
          id: conditionId,
          type: conditionNode.definition.type,
          config: conditionNode.createInitialConfig(),
        },
      ],
      edges: [
        {
          id: crypto.randomUUID(),
          source: startId,
          sourceHandle: 'variables',
          target: conditionId,
          targetHandle: 'entry',
        },
      ],
      outputs: [],
    },
    layout: {
      positions: {
        [startId]: { x: 120, y: 180 },
        [conditionId]: { x: 460, y: 180 },
      },
    },
  }
}
