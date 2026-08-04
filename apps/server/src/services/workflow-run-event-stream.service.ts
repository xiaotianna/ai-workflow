import type {
  WorkflowNodeExecutionStateVo,
  WorkflowRunStreamEvent,
  WorkflowTestRunVo,
} from '@/vo/workflow-run.vo'
import { Injectable } from '@nestjs/common'

type WorkflowRunStreamListener = (event: WorkflowRunStreamEvent) => void

@Injectable()
export class WorkflowRunEventStreamService {
  private readonly listeners = new Map<string, Set<WorkflowRunStreamListener>>()

  subscribe(runId: string, listener: WorkflowRunStreamListener): () => void {
    const runListeners = this.listeners.get(runId) ?? new Set<WorkflowRunStreamListener>()
    runListeners.add(listener)
    this.listeners.set(runId, runListeners)

    return () => {
      runListeners.delete(listener)
      if (runListeners.size === 0) this.listeners.delete(runId)
    }
  }

  hasSubscribers(runId: string): boolean {
    return Boolean(this.listeners.get(runId)?.size)
  }

  publishNodeFinished(
    runId: string,
    node: WorkflowNodeExecutionStateVo,
    snapshot: Pick<
      WorkflowTestRunVo,
      | 'nodeRuns'
      | 'nodeStates'
      | 'loopIterations'
      | 'traceNodeDurations'
      | 'traceNodeIds'
      | 'traceExecutions'
    >,
  ): void {
    this.publish(runId, {
      event: 'node_finished',
      id: `${runId}:${node.nodeId}:${node.status}`,
      data: { runId, node, ...snapshot },
    })
  }

  publishWorkflowFinished(run: WorkflowTestRunVo): void {
    this.publish(run.id, {
      event: 'workflow_finished',
      id: `${run.id}:${run.status}`,
      data: run,
    })
    this.listeners.delete(run.id)
  }

  private publish(runId: string, event: WorkflowRunStreamEvent): void {
    for (const listener of this.listeners.get(runId) ?? []) {
      listener(event)
    }
  }
}
