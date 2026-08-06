import { WorkflowRunRepository } from '@/repositories/workflow-run.repository'
import { WorkflowRunService } from '@/services/workflow-run.service'
import {
  parseExecuteNodeCommand,
  parseExecuteNodeResult,
  type ExecuteNodeCommand,
} from '@ai-workflow/protocol'
import { BuiltinNodeType } from '@ai-workflow/core'
import { Injectable, Logger, OnApplicationBootstrap, OnModuleDestroy } from '@nestjs/common'
import {
  WORKFLOW_COMMAND_EXCHANGE,
  WORKFLOW_OUTBOX_BATCH_SIZE,
  WORKFLOW_OUTBOX_CLAIM_TIMEOUT_MS,
  WORKFLOW_OUTBOX_MAX_PUBLISH_ATTEMPTS,
  WORKFLOW_OUTBOX_POLL_INTERVAL_MS,
} from './workflow-mq.constants'
import { WorkflowMqService } from './workflow-mq.service'

@Injectable()
export class WorkflowOutboxPublisher implements OnApplicationBootstrap, OnModuleDestroy {
  private readonly logger = new Logger(WorkflowOutboxPublisher.name)
  private timer?: NodeJS.Timeout
  private polling = false
  private stopping = false

  constructor(
    private readonly workflowRunRepository: WorkflowRunRepository,
    private readonly workflowRunService: WorkflowRunService,
    private readonly workflowMqService: WorkflowMqService,
  ) {}

  onApplicationBootstrap(): void {
    this.timer = setInterval(() => void this.poll(), WORKFLOW_OUTBOX_POLL_INTERVAL_MS)
    this.timer.unref()
    void this.poll()
  }

  onModuleDestroy(): void {
    this.stopping = true
    if (this.timer) clearInterval(this.timer)
  }

  private async poll(): Promise<void> {
    if (this.polling || this.stopping) return
    this.polling = true

    try {
      const commands = await this.workflowRunRepository.claimPendingCommands({
        limit: WORKFLOW_OUTBOX_BATCH_SIZE,
        staleBefore: new Date(Date.now() - WORKFLOW_OUTBOX_CLAIM_TIMEOUT_MS),
      })
      await Promise.all(commands.map((command) => this.publishCommand(command)))
    } catch (error) {
      this.logger.error(`Command Outbox 轮询失败：${getErrorMessage(error)}`)
    } finally {
      this.polling = false
    }
  }

  private async publishCommand(claimed: {
    id: string
    payload: unknown
    executionClass: string
    routingKey: string
    publishAttempts: number
  }): Promise<void> {
    let command: ExecuteNodeCommand
    try {
      command = parseExecuteNodeCommand(claimed.payload)
    } catch (error) {
      const message = `Outbox 命令不符合 workflow protocol：${getErrorMessage(error)}`
      await this.workflowRunService.failRunForCommand(claimed.id, {
        code: 'COMMAND_PAYLOAD_INVALID',
        message,
      })
      this.logger.error(`Command Outbox 数据损坏 commandId=${claimed.id}`)
      return
    }

    try {
      if (command.nodeType === BuiltinNodeType.SUB_WORKFLOW) {
        await this.workflowRunService.executeSubWorkflowCommand(command)
        return
      }
      await this.workflowMqService.publish(
        WORKFLOW_COMMAND_EXCHANGE,
        claimed.routingKey,
        Buffer.from(JSON.stringify(command)),
        {
          contentType: 'application/json',
          contentEncoding: 'utf8',
          messageId: command.commandId,
          correlationId: command.runId,
          type: 'workflow.execute-node.command.v1',
          timestamp: Date.now(),
        },
      )
      this.logger.debug(
        `Command 已发布 commandId=${command.commandId} nodeType=${command.nodeType} executionClass=${claimed.executionClass} routingKey=${claimed.routingKey}`,
      )
      await this.workflowRunRepository.markCommandPublished(command.commandId)
    } catch (error) {
      const message = getErrorMessage(error)
      if (claimed.publishAttempts < WORKFLOW_OUTBOX_MAX_PUBLISH_ATTEMPTS) {
        await this.workflowRunRepository.releaseCommandClaim({
          commandId: command.commandId,
          error: message,
          nextAttemptAt: new Date(Date.now() + getRetryDelayMs(claimed.publishAttempts)),
        })
        return
      }

      const result = parseExecuteNodeResult({
        protocolVersion: command.protocolVersion,
        commandId: command.commandId,
        nodeRunId: command.nodeRunId,
        executionKey: command.executionKey,
        leaseToken: command.leaseToken,
        status: 'FAILED',
        error: {
          code: 'COMMAND_PUBLISH_FAILED',
          message: '节点执行命令多次发布失败',
          retryable: false,
        },
      })

      try {
        const outcome = await this.workflowRunService.processNodeResult(result, message)
        if (outcome === 'stale') {
          await this.workflowRunRepository.releaseCommandClaim({
            commandId: command.commandId,
            error: message,
            failed: true,
          })
        }
      } catch (processError) {
        await this.workflowRunRepository.releaseCommandClaim({
          commandId: command.commandId,
          error: getErrorMessage(processError),
          nextAttemptAt: new Date(Date.now() + getRetryDelayMs(claimed.publishAttempts)),
        })
      }
    }
  }
}

function getRetryDelayMs(attempt: number) {
  return Math.min(250 * 2 ** Math.max(0, attempt - 1), 30_000)
}

function getErrorMessage(error: unknown) {
  return error instanceof Error && error.message ? error.message : '未知错误'
}
