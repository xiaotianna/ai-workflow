import { KnowledgeIngestionService } from '@/services/knowledge-ingestion.service'
import { KnowledgeEmbeddingService } from '@/services/knowledge-embedding.service'
import { Injectable, Logger, OnApplicationBootstrap, OnModuleDestroy } from '@nestjs/common'
import type { Channel, ConsumeMessage } from 'amqplib'
import { randomUUID } from 'node:crypto'

import { WORKFLOW_MQ_RECONNECT_DELAY_MS } from '../workflow-mq/workflow-mq.constants'
import { WorkflowMqService } from '../workflow-mq/workflow-mq.service'
import { parseKnowledgeCommand } from './knowledge-command'
import {
  KNOWLEDGE_COMMAND_MAX_PROCESS_ATTEMPTS,
  KNOWLEDGE_COMMAND_PREFETCH,
  KNOWLEDGE_COMMAND_QUEUE,
  KNOWLEDGE_COMMAND_RETRY_QUEUE,
} from './knowledge-mq.constants'

@Injectable()
export class KnowledgeCommandConsumer implements OnApplicationBootstrap, OnModuleDestroy {
  private readonly logger = new Logger(KnowledgeCommandConsumer.name)
  private readonly workerId = `knowledge-consumer:${randomUUID()}`
  private channel?: Channel
  private reconnectTimer?: NodeJS.Timeout
  private connecting = false
  private stopping = false

  constructor(
    private readonly knowledgeIngestionService: KnowledgeIngestionService,
    private readonly knowledgeEmbeddingService: KnowledgeEmbeddingService,
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
      await channel.prefetch(KNOWLEDGE_COMMAND_PREFETCH)
      await channel.consume(
        KNOWLEDGE_COMMAND_QUEUE,
        (message) => {
          if (message) void this.handleMessage(channel, message)
        },
        { noAck: false },
      )
      this.channel = channel
      channel.on('error', (error: Error) => {
        this.logger.error(`Knowledge Consumer Channel 异常：${error.message}`)
      })
      channel.on('close', () => {
        if (this.channel === channel) this.channel = undefined
        this.scheduleReconnect()
      })
      this.logger.log(`Knowledge Consumer 已监听队列：${KNOWLEDGE_COMMAND_QUEUE}`)
    } catch (error) {
      this.logger.warn(`Knowledge Consumer 连接失败：${getErrorMessage(error)}`)
      this.scheduleReconnect()
    } finally {
      this.connecting = false
    }
  }

  private async handleMessage(channel: Channel, message: ConsumeMessage): Promise<void> {
    let command
    try {
      command = parseKnowledgeCommand(JSON.parse(message.content.toString('utf8')))
    } catch (error) {
      this.logger.error(`丢弃非法 Knowledge Command：${getErrorMessage(error)}`)
      this.nack(channel, message, false)
      return
    }

    try {
      if (command.type === 'KNOWLEDGE_INDEX_BUILD_REQUESTED') {
        const build = await this.knowledgeIngestionService.materializeIndexBuild(
          command.aggregateId,
        )
        if (build.outcome === 'created' && build.versionCount === 0) {
          await this.knowledgeEmbeddingService.initializeEmptyIndex(command.aggregateId)
        }
        this.ack(channel, message)
        return
      }

      const outcome =
        command.type === 'KNOWLEDGE_DOCUMENT_VERSION_PROCESS_REQUESTED'
          ? await this.knowledgeIngestionService.preprocessDocumentVersion(
              command.aggregateId,
              this.workerId,
              KNOWLEDGE_COMMAND_MAX_PROCESS_ATTEMPTS,
            )
          : await this.knowledgeEmbeddingService.embedAndProjectVersion(
              command.aggregateId,
              this.workerId,
              KNOWLEDGE_COMMAND_MAX_PROCESS_ATTEMPTS,
            )
      if (outcome === 'failed') {
        this.nack(channel, message, false)
        return
      }
      this.ack(channel, message)
    } catch (error) {
      const attempt = readProcessAttempt(message) + 1
      this.logger.error(
        `Knowledge Command 处理失败 commandId=${command.commandId} attempt=${attempt}：${getErrorMessage(error)}`,
      )
      if (attempt >= KNOWLEDGE_COMMAND_MAX_PROCESS_ATTEMPTS) {
        try {
          if (command.type === 'KNOWLEDGE_INDEX_BUILD_REQUESTED') {
            await this.knowledgeIngestionService.failIndexBuild(
              command.aggregateId,
              getErrorMessage(error),
            )
          }
          this.nack(channel, message, false)
        } catch (finalizeError) {
          this.logger.error(`Knowledge 失败终态写入失败：${getErrorMessage(finalizeError)}`)
          this.nack(channel, message, true)
        }
        return
      }

      try {
        await this.workflowMqService.publish('', KNOWLEDGE_COMMAND_RETRY_QUEUE, message.content, {
          contentType: message.properties.contentType ?? 'application/json',
          contentEncoding: message.properties.contentEncoding ?? 'utf8',
          messageId: message.properties.messageId ?? command.commandId,
          correlationId: message.properties.correlationId ?? command.aggregateId,
          type: message.properties.type,
          timestamp: Date.now(),
          headers: {
            ...message.properties.headers,
            'x-knowledge-process-attempt': attempt,
          },
        })
        this.ack(channel, message)
      } catch (retryError) {
        this.logger.error(`Knowledge Command 重试入队失败：${getErrorMessage(retryError)}`)
        this.nack(channel, message, true)
      }
    }
  }

  private ack(channel: Channel, message: ConsumeMessage): void {
    try {
      channel.ack(message)
    } catch (error) {
      this.logger.warn(`Knowledge Command Ack 失败：${getErrorMessage(error)}`)
    }
  }

  private nack(channel: Channel, message: ConsumeMessage, requeue: boolean): void {
    try {
      channel.nack(message, false, requeue)
    } catch (error) {
      this.logger.warn(`Knowledge Command Nack 失败：${getErrorMessage(error)}`)
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
  const value = message.properties.headers?.['x-knowledge-process-attempt']
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 ? value : 0
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error && error.message ? error.message : '未知错误'
}
