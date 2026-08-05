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

export interface WorkflowLoopIterationVo {
  iteration: number
  maxIterations: number
}

export interface WorkflowNodeRunVo {
  id: string
  executionKey: string
  nodeId: string
  nodeType: string
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

/** 当前应用内某节点最近一次 NodeRun（完整运行 / 单节点 / 子工作流调用均计入） */
export interface WorkflowNodeLastRunVo {
  id: string
  runId: string
  executionKey: string
  nodeId: string
  nodeType: string
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
  runMode: TestRunMode
  runTrigger: WorkflowRunTrigger
  runStatus: WorkflowRunStatus
  triggeredBy?: {
    id: string
    username: string
  }
}

export interface WorkflowTraceExecutionVo {
  executionKey: string
  nodeId: string
  scopeKey: string
  sequence: number
  iteration?: number
  status: string
  input: unknown
  output?: unknown
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
  loopIterations: Record<string, WorkflowLoopIterationVo>
  traceNodeDurations: Record<string, number>
  traceNodeIds: string[]
  traceExecutions: WorkflowTraceExecutionVo[]
}

export interface WorkflowRunListItemVo {
  id: string
  traceId: string
  trigger: WorkflowRunTrigger
  mode: TestRunMode
  status: WorkflowRunStatus
  queuedAt: Date
  startedAt?: Date
  finishedAt?: Date
  durationMs?: number
  triggeredBy?: {
    id: string
    username: string
  }
}

export interface WorkflowRunListVo {
  items: WorkflowRunListItemVo[]
  nextCursor: string | null
}

export interface WorkflowRunDetailVo extends WorkflowTestRunVo {
  definition: unknown
  layout: unknown
}

export interface WorkflowRunNodeFinishedEventVo {
  runId: string
  node: WorkflowNodeExecutionStateVo
  nodeRuns: WorkflowNodeRunVo[]
  nodeStates: WorkflowNodeExecutionStateVo[]
  loopIterations: Record<string, WorkflowLoopIterationVo>
  traceNodeDurations: Record<string, number>
  traceNodeIds: string[]
  traceExecutions: WorkflowTraceExecutionVo[]
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
