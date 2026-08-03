import { WorkflowRunService } from '@/services/workflow-run.service'
import { parseExecuteNodeResult } from '@ai-workflow/protocol'
import { Injectable, Logger, OnApplicationBootstrap, OnModuleDestroy } from '@nestjs/common'
import type { Channel, ConsumeMessage } from 'amqplib'
import {
  WORKFLOW_MQ_RECONNECT_DELAY_MS,
  WORKFLOW_RESULT_MAX_PROCESS_ATTEMPTS,
  WORKFLOW_RESULT_PREFETCH,
  WORKFLOW_RESULT_QUEUE,
  WORKFLOW_RESULT_RETRY_QUEUE,
} from './workflow-mq.constants'
import { WorkflowMqService } from './workflow-mq.service'

@Injectable()
export class WorkflowResultConsumer implements OnApplicationBootstrap, OnModuleDestroy {
  private readonly logger = new Logger(WorkflowResultConsumer.name)
  private channel?: Channel
  private reconnectTimer?: NodeJS.Timeout
  private connecting = false
  private stopping = false

  constructor(
    private readonly workflowRunService: WorkflowRunService,
    private readonly workflowMqService: WorkflowMqService,
  ) {}

  onApplicationBootstrap(): void {
    void this.connectAndConsume()
  }

  async onModuleDestroy(): Promise<void> {
    this.stopping = true
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer)
    try {
      await this.channel?.close()
    } catch {
      // Channel 已随连接关闭时无需重复处理。
    }
  }

  private async connectAndConsume(): Promise<void> {
    if (this.connecting || this.channel || this.stopping) return
    this.connecting = true

    try {
      const channel = await this.workflowMqService.createConsumerChannel()
      await channel.prefetch(WORKFLOW_RESULT_PREFETCH)
      await channel.consume(
        WORKFLOW_RESULT_QUEUE,
        (message) => {
          if (message) void this.handleMessage(channel, message)
        },
        { noAck: false },
      )

      this.channel = channel
      channel.on('error', (error: Error) => {
        this.logger.error(`Result Consumer Channel 异常：${error.message}`)
      })
      channel.on('close', () => {
        if (this.channel === channel) this.channel = undefined
        this.scheduleReconnect()
      })
      this.logger.log(`Workflow Result Consumer 已监听队列：${WORKFLOW_RESULT_QUEUE}`)
    } catch (error) {
      this.logger.warn(`Workflow Result Consumer 连接失败：${getErrorMessage(error)}`)
      this.scheduleReconnect()
    } finally {
      this.connecting = false
    }
  }

  private async handleMessage(channel: Channel, message: ConsumeMessage): Promise<void> {
    let result
    try {
      result = parseExecuteNodeResult(JSON.parse(message.content.toString('utf8')))
    } catch (error) {
      this.logger.error(`丢弃非法 Workflow Result：${getErrorMessage(error)}`)
      this.nack(channel, message, false)
      return
    }

    try {
      const outcome = await this.workflowRunService.processNodeResult(result)
      if (outcome === 'stale') {
        this.logger.warn(`忽略过期 Workflow Result commandId=${result.commandId}`)
      }
      this.ack(channel, message)
    } catch (error) {
      const attempt = readProcessAttempt(message) + 1
      this.logger.error(
        `Workflow Result 处理失败 commandId=${result.commandId} attempt=${attempt}：${getErrorMessage(error)}`,
      )

      if (attempt >= WORKFLOW_RESULT_MAX_PROCESS_ATTEMPTS) {
        try {
          await this.workflowRunService.failRunForCommand(result.commandId, {
            code: 'RESULT_PROCESSING_FAILED',
            message: `节点结果处理连续失败：${getErrorMessage(error)}`,
          })
          this.nack(channel, message, false)
        } catch (finalizeError) {
          this.logger.error(
            `Workflow Run 失败终态写入失败 commandId=${result.commandId}：${getErrorMessage(finalizeError)}`,
          )
          this.nack(channel, message, true)
        }
        return
      }

      try {
        await this.workflowMqService.publish('', WORKFLOW_RESULT_RETRY_QUEUE, message.content, {
          contentType: message.properties.contentType ?? 'application/json',
          contentEncoding: message.properties.contentEncoding ?? 'utf8',
          messageId: message.properties.messageId ?? result.commandId,
          correlationId: message.properties.correlationId,
          type: message.properties.type ?? 'workflow.execute-node.result.v1',
          timestamp: Date.now(),
          headers: {
            ...message.properties.headers,
            'x-workflow-process-attempt': attempt,
          },
        })
        this.ack(channel, message)
      } catch (retryError) {
        this.logger.error(`Workflow Result 重试入队失败：${getErrorMessage(retryError)}`)
        this.nack(channel, message, true)
      }
    }
  }

  private ack(channel: Channel, message: ConsumeMessage): void {
    try {
      channel.ack(message)
    } catch (error) {
      this.logger.warn(`Workflow Result Ack 失败，Broker 将重新投递：${getErrorMessage(error)}`)
    }
  }

  private nack(channel: Channel, message: ConsumeMessage, requeue: boolean): void {
    try {
      channel.nack(message, false, requeue)
    } catch (error) {
      this.logger.warn(`Workflow Result Nack 失败：${getErrorMessage(error)}`)
    }
  }

  private scheduleReconnect(): void {
    if (this.stopping || this.reconnectTimer) return
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = undefined
      void this.connectAndConsume()
    }, WORKFLOW_MQ_RECONNECT_DELAY_MS)
    this.reconnectTimer.unref()
  }
}

function readProcessAttempt(message: ConsumeMessage): number {
  const value = message.properties.headers?.['x-workflow-process-attempt']
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 ? value : 0
}

function getErrorMessage(error: unknown) {
  return error instanceof Error && error.message ? error.message : '未知错误'
}
