import { WorkflowNodeRunStatus, WorkflowRunStatus } from '@/generated/prisma/client'
import { WorkflowRunRepository } from '@/repositories/workflow-run.repository'
import { WorkflowRunService } from '@/services/workflow-run.service'
import { Injectable, Logger, OnApplicationBootstrap, OnModuleDestroy } from '@nestjs/common'

const WORKFLOW_TIMEOUT_SCAN_INTERVAL_MS = 1000,
  WORKFLOW_TIMEOUT_SCAN_BATCH_SIZE = 100

@Injectable()
export class WorkflowRunTimeoutScanner implements OnApplicationBootstrap, OnModuleDestroy {
  private readonly logger = new Logger(WorkflowRunTimeoutScanner.name)
  private timer?: NodeJS.Timeout
  private scanning = false
  private stopping = false

  constructor(
    private readonly workflowRunRepository: WorkflowRunRepository,
    private readonly workflowRunService: WorkflowRunService,
  ) {}

  onApplicationBootstrap(): void {
    this.timer = setInterval(() => void this.scan(), WORKFLOW_TIMEOUT_SCAN_INTERVAL_MS)
    this.timer.unref()
    void this.scan()
  }

  onModuleDestroy(): void {
    this.stopping = true
    if (this.timer) clearInterval(this.timer)
  }

  private async scan(): Promise<void> {
    if (this.scanning || this.stopping) return
    this.scanning = true

    try {
      const completedChildRunIds = await this.workflowRunRepository.findPendingChildCompletionIds(
        WORKFLOW_TIMEOUT_SCAN_BATCH_SIZE,
      )
      await Promise.all(
        completedChildRunIds.map((runId) =>
          this.workflowRunService.processChildRunCompletion(runId),
        ),
      )

      const commandIds = await this.workflowRunRepository.findExpiredCommandIds(
        new Date(),
        WORKFLOW_TIMEOUT_SCAN_BATCH_SIZE,
      )
      await Promise.all(
        commandIds.map((commandId) =>
          this.workflowRunService.failRunForCommand(commandId, {
            code: 'NODE_EXECUTION_TIMED_OUT',
            message: '节点执行超过截止时间',
            runStatus: WorkflowRunStatus.TIMED_OUT,
            nodeRunStatus: WorkflowNodeRunStatus.TIMED_OUT,
          }),
        ),
      )
    } catch (error) {
      this.logger.error(`Workflow Run 超时扫描失败：${getErrorMessage(error)}`)
    } finally {
      this.scanning = false
    }
  }
}

function getErrorMessage(error: unknown) {
  return error instanceof Error && error.message ? error.message : '未知错误'
}
