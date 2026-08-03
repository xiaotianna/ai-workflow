import type { NodeExecutionStatus } from '@ai-workflow/nodes-ui'

export type WorkflowEdgeExecutionStatus = NodeExecutionStatus

/** 根据两端节点运行态派生连线展示状态；未执行到的分支保持默认样式。 */
export function resolveWorkflowEdgeExecutionStatus(
  sourceStatus: NodeExecutionStatus | undefined,
  targetStatus: NodeExecutionStatus | undefined,
): WorkflowEdgeExecutionStatus | undefined {
  if (targetStatus === 'RUNNING') return 'RUNNING'
  if (targetStatus === 'FAILED' && sourceStatus) return 'FAILED'
  if (sourceStatus === 'SUCCEEDED' && targetStatus === 'SUCCEEDED') return 'SUCCEEDED'
  return undefined
}

export function getWorkflowEdgeExecutionClassName(
  status: WorkflowEdgeExecutionStatus | undefined,
): string | undefined {
  if (status === 'RUNNING') return 'workflow-edge--running'
  if (status === 'SUCCEEDED') return 'workflow-edge--succeeded'
  if (status === 'FAILED') return 'workflow-edge--failed'
  return undefined
}
