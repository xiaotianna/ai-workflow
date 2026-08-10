import { Prisma } from '@/generated/prisma/client'
import { PrismaService } from '@/infra/prisma/prisma.service'
import { Injectable } from '@nestjs/common'

export interface ClaimedKnowledgeOutboxEvent {
  id: string
  eventType: string
  aggregateType: string
  aggregateId: string
  payload: Prisma.JsonValue
  attemptCount: number
}

@Injectable()
export class KnowledgeOutboxRepository {
  constructor(private readonly prisma: PrismaService) {}

  claimPending(options: {
    publisherId: string
    limit: number
    staleBefore: Date
  }): Promise<ClaimedKnowledgeOutboxEvent[]> {
    return this.prisma.$transaction(async (transaction) => {
      const rows = await transaction.$queryRaw<ClaimedKnowledgeOutboxEvent[]>(Prisma.sql`
        WITH candidates AS (
          SELECT "id"
          FROM "knowledge_outbox_events"
          WHERE (
            ("status" = 'PENDING' AND "availableAt" <= NOW())
            OR ("status" = 'PUBLISHING' AND "lockedAt" < ${options.staleBefore})
          )
          ORDER BY "createdAt" ASC
          FOR UPDATE SKIP LOCKED
          LIMIT ${options.limit}
        )
        UPDATE "knowledge_outbox_events" AS event
        SET
          "status" = 'PUBLISHING',
          "attemptCount" = event."attemptCount" + 1,
          "lockedBy" = ${options.publisherId},
          "lockedAt" = NOW(),
          "errorMessage" = NULL,
          "updatedAt" = NOW()
        FROM candidates
        WHERE event."id" = candidates."id"
        RETURNING
          event."id",
          event."eventType",
          event."aggregateType",
          event."aggregateId",
          event."payload",
          event."attemptCount"
      `)

      return rows
    })
  }

  async markPublished(eventId: string, publisherId: string): Promise<boolean> {
    const result = await this.prisma.knowledgeOutboxEvent.updateMany({
      where: { id: eventId, status: 'PUBLISHING', lockedBy: publisherId },
      data: {
        status: 'PUBLISHED',
        publishedAt: new Date(),
        lockedBy: null,
        lockedAt: null,
        errorMessage: null,
      },
    })
    return result.count === 1
  }

  async releaseClaim(options: {
    eventId: string
    publisherId: string
    error: string
    nextAttemptAt?: Date
    failed?: boolean
  }): Promise<boolean> {
    const result = await this.prisma.knowledgeOutboxEvent.updateMany({
      where: { id: options.eventId, status: 'PUBLISHING', lockedBy: options.publisherId },
      data: {
        status: options.failed ? 'FAILED' : 'PENDING',
        availableAt: options.nextAttemptAt ?? new Date(),
        lockedBy: null,
        lockedAt: null,
        errorMessage: options.error.slice(0, 4000),
      },
    })
    return result.count === 1
  }
}
