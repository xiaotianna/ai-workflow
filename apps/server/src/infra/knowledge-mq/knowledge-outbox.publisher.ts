import {
  KnowledgeOutboxRepository,
  type ClaimedKnowledgeOutboxEvent,
} from '@/repositories/knowledge-outbox.repository'
import { Injectable, Logger, OnApplicationBootstrap, OnModuleDestroy } from '@nestjs/common'
import { randomUUID } from 'node:crypto'

import { WorkflowMqService } from '../workflow-mq/workflow-mq.service'
import type { KnowledgeCommand, KnowledgeCommandType } from './knowledge-command'
import { KNOWLEDGE_COMMAND_TYPES } from './knowledge-command'
import {
  KNOWLEDGE_COMMAND_EXCHANGE,
  KNOWLEDGE_COMMAND_ROUTING_KEY,
  KNOWLEDGE_OUTBOX_BATCH_SIZE,
  KNOWLEDGE_OUTBOX_CLAIM_TIMEOUT_MS,
  KNOWLEDGE_OUTBOX_MAX_PUBLISH_ATTEMPTS,
  KNOWLEDGE_OUTBOX_POLL_INTERVAL_MS,
} from './knowledge-mq.constants'

@Injectable()
export class KnowledgeOutboxPublisher implements OnApplicationBootstrap, OnModuleDestroy {
  private readonly logger = new Logger(KnowledgeOutboxPublisher.name)
  private readonly publisherId = `knowledge-outbox:${randomUUID()}`
  private timer?: NodeJS.Timeout
  private polling = false
  private stopping = false

  constructor(
    private readonly knowledgeOutboxRepository: KnowledgeOutboxRepository,
    private readonly workflowMqService: WorkflowMqService,
  ) {}

  onApplicationBootstrap(): void {
    this.timer = setInterval(() => void this.poll(), KNOWLEDGE_OUTBOX_POLL_INTERVAL_MS)
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
      const events = await this.knowledgeOutboxRepository.claimPending({
        publisherId: this.publisherId,
        limit: KNOWLEDGE_OUTBOX_BATCH_SIZE,
        staleBefore: new Date(Date.now() - KNOWLEDGE_OUTBOX_CLAIM_TIMEOUT_MS),
      })
      await Promise.all(events.map((event) => this.publishEvent(event)))
    } catch (error) {
      this.logger.error(`Knowledge Outbox 轮询失败：${getErrorMessage(error)}`)
    } finally {
      this.polling = false
    }
  }

  private async publishEvent(event: ClaimedKnowledgeOutboxEvent): Promise<void> {
    let command: KnowledgeCommand
    try {
      command = toKnowledgeCommand(event)
    } catch (error) {
      await this.knowledgeOutboxRepository.releaseClaim({
        eventId: event.id,
        publisherId: this.publisherId,
        error: getErrorMessage(error),
        failed: true,
      })
      this.logger.error(`Knowledge Outbox 数据损坏 eventId=${event.id}`)
      return
    }

    try {
      await this.workflowMqService.publish(
        KNOWLEDGE_COMMAND_EXCHANGE,
        KNOWLEDGE_COMMAND_ROUTING_KEY,
        Buffer.from(JSON.stringify(command)),
        {
          contentType: 'application/json',
          contentEncoding: 'utf8',
          messageId: command.commandId,
          correlationId: command.aggregateId,
          type: `knowledge.${command.type.toLowerCase()}.v1`,
          timestamp: Date.now(),
        },
      )
      await this.knowledgeOutboxRepository.markPublished(event.id, this.publisherId)
    } catch (error) {
      await this.knowledgeOutboxRepository.releaseClaim({
        eventId: event.id,
        publisherId: this.publisherId,
        error: getErrorMessage(error),
        ...(event.attemptCount >= KNOWLEDGE_OUTBOX_MAX_PUBLISH_ATTEMPTS
          ? { failed: true }
          : { nextAttemptAt: new Date(Date.now() + getRetryDelayMs(event.attemptCount)) }),
      })
    }
  }
}

function toKnowledgeCommand(event: ClaimedKnowledgeOutboxEvent): KnowledgeCommand {
  if (!KNOWLEDGE_COMMAND_TYPES.includes(event.eventType as KnowledgeCommandType)) {
    throw new Error(`不支持的事件类型：${event.eventType}`)
  }

  const expectedAggregateType =
    event.eventType === 'KNOWLEDGE_INDEX_BUILD_REQUESTED'
      ? 'KNOWLEDGE_BASE_INDEX'
      : 'KNOWLEDGE_DOCUMENT_VERSION'
  if (event.aggregateType !== expectedAggregateType) {
    throw new Error(`事件聚合类型不匹配：${event.aggregateType}`)
  }

  return {
    schemaVersion: 1,
    commandId: event.id,
    type: event.eventType as KnowledgeCommandType,
    aggregateId: event.aggregateId,
  }
}

function getRetryDelayMs(attempt: number): number {
  return Math.min(500 * 2 ** Math.max(0, attempt - 1), 60_000)
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error && error.message ? error.message : '未知错误'
}
