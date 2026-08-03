import type { TestRunMode } from '@/dto/workflow-run.dto'
import type {
  WorkflowNodeRunStatus,
  WorkflowRunStatus,
  WorkflowRunTrigger,
} from '@/generated/prisma/client'

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
  input?: unknown
  output?: unknown
  startedAt?: Date
  finishedAt?: Date
  durationMs?: number
  error?: {
    code: string
    message: string
    details?: unknown
  }
}

export interface WorkflowTestRunVo {
  id: string
  traceId: string
  trigger: WorkflowRunTrigger
  mode: TestRunMode
  targetNodeId?: string
  status: WorkflowRunStatus
  input: unknown
  output?: unknown
  queuedAt: Date
  startedAt?: Date
  finishedAt?: Date
  durationMs?: number
  triggeredBy?: {
    id: string
    username: string
  }
  error?: {
    code: string
    message: string
    details?: unknown
  }
  nodeRuns: WorkflowNodeRunVo[]
  nodeStates: WorkflowNodeExecutionStateVo[]
  traceNodeDurations: Record<string, number>
  traceNodeIds: string[]
}

export interface WorkflowRunNodeFinishedEventVo {
  runId: string
  node: WorkflowNodeExecutionStateVo
  nodeRuns: WorkflowNodeRunVo[]
  nodeStates: WorkflowNodeExecutionStateVo[]
  traceNodeDurations: Record<string, number>
  traceNodeIds: string[]
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
