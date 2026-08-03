import type { TestRunMode } from '@/dto/workflow-run.dto'
import type { WorkflowNodeRunStatus, WorkflowRunStatus } from '@/generated/prisma/client'

export type WorkflowNodeExecutionStatus = 'RUNNING' | 'SUCCEEDED' | 'FAILED'

export interface WorkflowNodeExecutionStateVo {
  nodeId: string
  status: WorkflowNodeExecutionStatus
}

export interface WorkflowNodeRunVo {
  id: string
  nodeId: string
  nodeType: string
  executionKey: string
  attempt: number
  status: WorkflowNodeRunStatus
  output?: unknown
  error?: {
    code: string
    message: string
    details?: unknown
  }
}

export interface WorkflowTestRunVo {
  id: string
  mode: TestRunMode
  targetNodeId?: string
  status: WorkflowRunStatus
  output?: unknown
  error?: {
    code: string
    message: string
    details?: unknown
  }
  nodeRuns: WorkflowNodeRunVo[]
  nodeStates: WorkflowNodeExecutionStateVo[]
}

export interface WorkflowRunNodeFinishedEventVo {
  runId: string
  node: WorkflowNodeExecutionStateVo
  nodeStates: WorkflowNodeExecutionStateVo[]
}

export type WorkflowRunStreamEvent =
  | {
      event: 'node_finished'
      id: string
      data: WorkflowRunNodeFinishedEventVo
    }
  | {
      event: 'workflow_finished'
      id: string
      data: WorkflowTestRunVo
    }
