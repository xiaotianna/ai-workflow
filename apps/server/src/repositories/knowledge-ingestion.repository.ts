import { Prisma } from '@/generated/prisma/client'
import { KNOWLEDGE_DOCUMENT_PARSER_VERSION } from '@/constant/knowledge-document'
import { PrismaService } from '@/infra/prisma/prisma.service'
import type { KnowledgeChunkInput } from '@/services/knowledge-chunker.service'
import { Injectable } from '@nestjs/common'
import { createHash, randomUUID } from 'node:crypto'

export interface ClaimedKnowledgeDocumentVersion {
  id: string
  attemptId: string
  attempt: number
  sourceObjectKey: string
  sourceFileName: string
  segmentationMode: 'GENERAL' | 'QA' | 'PARENT_CHILD'
  maxSegmentLength: number
  overlapLength: number
  normalizeWhitespace: boolean
}

export interface ClaimedKnowledgeProjection {
  id: string
  attemptId: string
  attempt: number
  expectedChecksum: string
  knowledgeBaseIndex: {
    id: string
    knowledgeBaseId: string
    embeddingProvider: string
    embeddingModelId: string
    distanceMetric: 'COSINE' | 'EUCLIDEAN' | 'INNER_PRODUCT'
    embeddingDimension: number | null
    embeddingSpaceKey: string | null
    configuredModel: {
      group: {
        id: string
        baseUrl: string | null
        apiKeyCiphertext: Uint8Array<ArrayBuffer> | null
        apiKeyIv: Uint8Array<ArrayBuffer> | null
        apiKeyAuthTag: Uint8Array<ArrayBuffer> | null
        credentialKeyVersion: number | null
      }
    }
    knowledgeBase: { ownerId: string }
  }
  document: { id: string; name: string; enabled: boolean }
  chunks: Array<{
    id: string
    sequence: number
    content: string
    contentHash: string | null
    metadata: Prisma.JsonValue
  }>
}

@Injectable()
export class KnowledgeIngestionRepository {
  constructor(private readonly prisma: PrismaService) {}

  async materializeIndexBuild(
    knowledgeBaseIndexId: string,
  ): Promise<{ outcome: 'created' | 'stale'; versionCount: number }> {
    return this.prisma.$transaction(async (transaction) => {
      await transaction.$queryRaw(
        Prisma.sql`SELECT "id" FROM "knowledge_base_indexes" WHERE "id" = ${knowledgeBaseIndexId}::uuid FOR UPDATE`,
      )
      const index = await transaction.knowledgeBaseIndex.findUnique({
        where: { id: knowledgeBaseIndexId },
        select: {
          id: true,
          knowledgeBaseId: true,
          status: true,
          configHash: true,
          defaultChunkConfig: true,
          defaultCleaningConfig: true,
          knowledgeBase: { select: { activeIndexId: true } },
        },
      })
      if (!index || index.status !== 'BUILDING') return { outcome: 'stale', versionCount: 0 }
      await transaction.$queryRaw(
        Prisma.sql`SELECT "id" FROM "knowledge_bases" WHERE "id" = ${index.knowledgeBaseId}::uuid FOR UPDATE`,
      )

      const documents = await transaction.knowledgeDocument.findMany({
          where: {
            knowledgeBaseId: index.knowledgeBaseId,
            lifecycleStatus: 'ACTIVE',
            status: { in: ['READY', 'FAILED'] },
            enabled: true,
          },
          select: {
            id: true,
            status: true,
            sources: {
              orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
              take: 1,
              select: { id: true, checksum: true },
            },
          },
        }),
        chunkConfig = parseChunkConfig(index.defaultChunkConfig),
        cleaningConfig = parseCleaningConfig(index.defaultCleaningConfig),
        processingDocumentIds = documents.flatMap((document) =>
          document.sources[0] &&
          (!index.knowledgeBase.activeIndexId || document.status === 'FAILED')
            ? [document.id]
            : [],
        )
      if (processingDocumentIds.length > 0) {
        await transaction.knowledgeDocument.updateMany({
          where: { id: { in: processingDocumentIds } },
          data: { status: 'PROCESSING', errorMessage: null },
        })
      }
      await Promise.all(
        documents.map(async (document) => {
          const source = document.sources[0]
          if (!source) return

          const idempotencyKey = createHash('sha256')
              .update(
                `${index.id}:${document.id}:${source.id}:${source.checksum}:${index.configHash}`,
              )
              .digest('hex'),
            existing = await transaction.knowledgeDocumentVersion.findFirst({
              where: {
                documentId: document.id,
                sourceId: source.id,
                knowledgeBaseIndexId: index.id,
              },
              select: { id: true },
            })
          if (existing) return

          const latest = await transaction.knowledgeDocumentVersion.findFirst({
              where: { documentId: document.id, knowledgeBaseIndexId: index.id },
              orderBy: { version: 'desc' },
              select: { version: true },
            }),
            version = await transaction.knowledgeDocumentVersion.create({
              data: {
                knowledgeBaseId: index.knowledgeBaseId,
                documentId: document.id,
                sourceId: source.id,
                knowledgeBaseIndexId: index.id,
                version: (latest?.version ?? 0) + 1,
                idempotencyKey,
                parserVersion: KNOWLEDGE_DOCUMENT_PARSER_VERSION,
                cleanerVersion: 'conservative-v1',
                cleaningConfig: cleaningConfig as Prisma.InputJsonValue,
                segmentationMode: chunkConfig.segmentationMode,
                chunkConfig: chunkConfig as Prisma.InputJsonValue,
                configHash: index.configHash,
              },
              select: { id: true },
            })
          await transaction.knowledgeSearchProjection.create({
            data: {
              knowledgeBaseIndexId: index.id,
              documentVersionId: version.id,
            },
          })
          await transaction.knowledgeOutboxEvent.create({
            data: {
              knowledgeBaseId: index.knowledgeBaseId,
              eventType: 'KNOWLEDGE_DOCUMENT_VERSION_PROCESS_REQUESTED',
              aggregateType: 'KNOWLEDGE_DOCUMENT_VERSION',
              aggregateId: version.id,
              idempotencyKey: `knowledge-document-version-process:${version.id}`,
              payload: { documentVersionId: version.id },
            },
          })
        }),
      )

      return {
        outcome: 'created',
        versionCount: documents.filter(({ sources }) => sources[0]).length,
      }
    })
  }

  getEmptyIndexBuild(knowledgeBaseIndexId: string) {
    return this.prisma.knowledgeBaseIndex.findFirst({
      where: {
        id: knowledgeBaseIndexId,
        status: 'BUILDING',
        versions: { none: {} },
      },
      select: {
        id: true,
        knowledgeBaseId: true,
        embeddingProvider: true,
        embeddingModelId: true,
        distanceMetric: true,
        configuredModel: {
          select: {
            group: {
              select: {
                id: true,
                baseUrl: true,
                apiKeyCiphertext: true,
                apiKeyIv: true,
                apiKeyAuthTag: true,
                credentialKeyVersion: true,
              },
            },
          },
        },
      },
    })
  }

  async activateEmptyIndex(options: {
    knowledgeBaseIndexId: string
    embeddingDimension: number
    embeddingSpaceKey: string
  }): Promise<'completed' | 'stale'> {
    return this.prisma.$transaction(async (transaction) => {
      await transaction.$queryRaw(
        Prisma.sql`SELECT "id" FROM "knowledge_base_indexes" WHERE "id" = ${options.knowledgeBaseIndexId}::uuid FOR UPDATE`,
      )
      const index = await transaction.knowledgeBaseIndex.findUnique({
        where: { id: options.knowledgeBaseIndexId },
        select: {
          id: true,
          knowledgeBaseId: true,
          status: true,
          _count: { select: { versions: true } },
          knowledgeBase: { select: { activeIndexId: true } },
        },
      })
      if (!index || index.status !== 'BUILDING' || index._count.versions !== 0) return 'stale'

      if (index.knowledgeBase.activeIndexId) {
        await transaction.knowledgeBaseIndex.update({
          where: { id: index.knowledgeBase.activeIndexId },
          data: { retiredAt: new Date() },
        })
      }
      await transaction.knowledgeBaseIndex.update({
        where: { id: index.id },
        data: {
          embeddingDimension: options.embeddingDimension,
          embeddingSpaceKey: options.embeddingSpaceKey,
          status: 'READY',
          readyAt: new Date(),
          activatedAt: new Date(),
        },
      })
      await transaction.knowledgeBase.update({
        where: { id: index.knowledgeBaseId },
        data: { activeIndexId: index.id },
      })
      return 'completed'
    })
  }

  async claimDocumentVersion(
    documentVersionId: string,
    workerId: string,
  ): Promise<ClaimedKnowledgeDocumentVersion | null> {
    return this.prisma.$transaction(async (transaction) => {
      await transaction.$queryRaw(
        Prisma.sql`SELECT "id" FROM "knowledge_document_versions" WHERE "id" = ${documentVersionId}::uuid FOR UPDATE`,
      )
      const version = await transaction.knowledgeDocumentVersion.findUnique({
        where: { id: documentVersionId },
        select: {
          id: true,
          status: true,
          attemptCount: true,
          segmentationMode: true,
          chunkConfig: true,
          cleaningConfig: true,
          knowledgeBaseIndex: { select: { status: true } },
          source: {
            select: { objectKey: true, originalFileName: true },
          },
        },
      })
      if (
        !version ||
        !['BUILDING', 'READY'].includes(version.knowledgeBaseIndex.status) ||
        !['QUEUED', 'PARSING', 'CHUNKING'].includes(version.status)
      ) {
        return null
      }

      const chunkConfig = parseChunkConfig(version.chunkConfig),
        cleaningConfig = parseCleaningConfig(version.cleaningConfig),
        attempt = version.attemptCount + 1,
        attemptId = randomUUID()
      await transaction.knowledgeDocumentVersion.update({
        where: { id: version.id },
        data: {
          status: 'PARSING',
          progress: 10,
          attemptCount: attempt,
          startedAt: new Date(),
          errorCode: null,
          errorMessage: null,
        },
      })
      await transaction.knowledgeIngestionAttempt.create({
        data: {
          id: attemptId,
          documentVersionId: version.id,
          attempt,
          traceId: `${version.id}:${attempt}:${randomUUID()}`,
          workerId,
          stage: 'PARSING',
          heartbeatAt: new Date(),
        },
      })

      return {
        id: version.id,
        attemptId,
        attempt,
        sourceObjectKey: version.source.objectKey,
        sourceFileName: version.source.originalFileName,
        segmentationMode: version.segmentationMode,
        maxSegmentLength: chunkConfig.maxSegmentLength,
        overlapLength: chunkConfig.overlapLength,
        normalizeWhitespace: cleaningConfig.normalizeWhitespace,
      }
    })
  }

  async finishPreprocessing(options: {
    documentVersionId: string
    attemptId: string
    textLength: number
    chunks: KnowledgeChunkInput[]
  }): Promise<'completed' | 'stale'> {
    return this.prisma.$transaction(async (transaction) => {
      await transaction.$queryRaw(
        Prisma.sql`SELECT "id" FROM "knowledge_document_versions" WHERE "id" = ${options.documentVersionId}::uuid FOR UPDATE`,
      )
      const version = await transaction.knowledgeDocumentVersion.findUnique({
        where: { id: options.documentVersionId },
        select: {
          id: true,
          knowledgeBaseId: true,
          documentId: true,
          knowledgeBaseIndexId: true,
          status: true,
          knowledgeBaseIndex: { select: { status: true } },
        },
      })
      if (
        !version ||
        !['BUILDING', 'READY'].includes(version.knowledgeBaseIndex.status) ||
        !['PARSING', 'CHUNKING'].includes(version.status)
      ) {
        return 'stale'
      }

      await transaction.knowledgeDocumentVersion.update({
        where: { id: version.id },
        data: { status: 'CHUNKING', progress: 35 },
      })
      await transaction.knowledgeChunk.deleteMany({
        where: { documentVersionId: version.id },
      })
      await transaction.knowledgeChunk.createMany({
        data: options.chunks.map((chunk, index) => ({
          documentId: version.documentId,
          documentVersionId: version.id,
          knowledgeBaseIndexId: version.knowledgeBaseIndexId,
          sequence: index + 1,
          content: chunk.content,
          contentHash: createHash('sha256').update(chunk.content).digest('hex'),
          tokenCount: 0,
          metadata: chunk.metadata,
        })),
      })

      const projectionChecksum = createHash('sha256')
        .update(options.chunks.map((chunk) => chunk.content).join('\u0000'))
        .digest('hex')
      await transaction.knowledgeSearchProjection.update({
        where: { documentVersionId: version.id },
        data: {
          expectedChunkCount: options.chunks.length,
          expectedChecksum: projectionChecksum,
          status: 'PENDING',
        },
      })
      await transaction.knowledgeDocumentVersion.update({
        where: { id: version.id },
        data: {
          status: 'EMBEDDING',
          progress: 50,
          characterCount: options.textLength,
          chunkCount: options.chunks.length,
        },
      })
      await transaction.knowledgeIngestionAttempt.updateMany({
        where: { id: options.attemptId, status: 'RUNNING' },
        data: {
          status: 'SUCCEEDED',
          stage: 'CHUNKING',
          heartbeatAt: new Date(),
          finishedAt: new Date(),
        },
      })
      await transaction.knowledgeOutboxEvent.upsert({
        where: { idempotencyKey: `knowledge-document-project:${version.id}` },
        create: {
          knowledgeBaseId: version.knowledgeBaseId,
          eventType: 'KNOWLEDGE_DOCUMENT_PROJECTION_REQUESTED',
          aggregateType: 'KNOWLEDGE_DOCUMENT_VERSION',
          aggregateId: version.id,
          idempotencyKey: `knowledge-document-project:${version.id}`,
          payload: { documentVersionId: version.id },
        },
        update: {},
      })
      return 'completed'
    })
  }

  async failDocumentVersion(options: {
    documentVersionId: string
    attemptId: string
    errorCode: string
    errorMessage: string
    retryable: boolean
  }): Promise<void> {
    await this.prisma.$transaction(async (transaction) => {
      const version = await transaction.knowledgeDocumentVersion.findUnique({
        where: { id: options.documentVersionId },
        select: {
          documentId: true,
          knowledgeBaseId: true,
          knowledgeBaseIndexId: true,
        },
      })
      if (!version) return

      const updated = await transaction.knowledgeDocumentVersion.updateMany({
        where: {
          id: options.documentVersionId,
          status: { in: ['PARSING', 'CHUNKING'] },
        },
        data: {
          status: options.retryable ? 'QUEUED' : 'FAILED',
          progress: 0,
          errorCode: options.errorCode,
          errorMessage: options.errorMessage.slice(0, 4000),
        },
      })
      await transaction.knowledgeIngestionAttempt.updateMany({
        where: { id: options.attemptId, status: 'RUNNING' },
        data: {
          status: 'FAILED',
          retryable: options.retryable,
          errorCode: options.errorCode,
          errorMessage: options.errorMessage.slice(0, 4000),
          finishedAt: new Date(),
        },
      })
      if (options.retryable || !updated.count) return

      await transaction.knowledgeDocument.update({
        where: { id: version.documentId },
        data: {
          status: 'FAILED',
          errorMessage: options.errorMessage.slice(0, 4000),
        },
      })
      await this.finalizeIndexBuildIfSettled(
        transaction,
        version.knowledgeBaseIndexId,
        version.knowledgeBaseId,
      )
    })
  }

  async claimProjection(
    documentVersionId: string,
    workerId: string,
  ): Promise<ClaimedKnowledgeProjection | null> {
    return this.prisma.$transaction(async (transaction) => {
      await transaction.$queryRaw(
        Prisma.sql`SELECT "id" FROM "knowledge_document_versions" WHERE "id" = ${documentVersionId}::uuid FOR UPDATE`,
      )
      const version = await transaction.knowledgeDocumentVersion.findUnique({
        where: { id: documentVersionId },
        select: {
          id: true,
          status: true,
          attemptCount: true,
          document: { select: { id: true, name: true, enabled: true } },
          projection: {
            select: {
              status: true,
              expectedChecksum: true,
              expectedChunkCount: true,
            },
          },
          chunks: {
            orderBy: { sequence: 'asc' },
            select: {
              id: true,
              sequence: true,
              content: true,
              contentHash: true,
              metadata: true,
            },
          },
          knowledgeBaseIndex: {
            select: {
              id: true,
              knowledgeBaseId: true,
              embeddingProvider: true,
              embeddingModelId: true,
              distanceMetric: true,
              embeddingDimension: true,
              embeddingSpaceKey: true,
              status: true,
              knowledgeBase: { select: { ownerId: true } },
              configuredModel: {
                select: {
                  group: {
                    select: {
                      id: true,
                      baseUrl: true,
                      apiKeyCiphertext: true,
                      apiKeyIv: true,
                      apiKeyAuthTag: true,
                      credentialKeyVersion: true,
                    },
                  },
                },
              },
            },
          },
        },
      })
      if (
        !version ||
        version.status !== 'EMBEDDING' ||
        !['BUILDING', 'READY'].includes(version.knowledgeBaseIndex.status) ||
        !version.projection ||
        !['PENDING', 'WRITING', 'FAILED'].includes(version.projection.status) ||
        !version.projection.expectedChecksum ||
        version.projection.expectedChunkCount !== version.chunks.length ||
        !version.chunks.length
      ) {
        return null
      }

      const attempt = version.attemptCount + 1,
        attemptId = randomUUID()
      await transaction.knowledgeDocumentVersion.update({
        where: { id: version.id },
        data: { attemptCount: attempt, progress: 60 },
      })
      await transaction.knowledgeSearchProjection.update({
        where: { documentVersionId: version.id },
        data: { status: 'WRITING', errorCode: null, errorMessage: null },
      })
      await transaction.knowledgeIngestionAttempt.create({
        data: {
          id: attemptId,
          documentVersionId: version.id,
          attempt,
          traceId: `${version.id}:${attempt}:${randomUUID()}`,
          workerId,
          stage: 'EMBEDDING',
          heartbeatAt: new Date(),
        },
      })

      return {
        id: version.id,
        attemptId,
        attempt,
        expectedChecksum: version.projection.expectedChecksum,
        knowledgeBaseIndex: version.knowledgeBaseIndex,
        document: version.document,
        chunks: version.chunks,
      }
    })
  }

  async finishProjection(options: {
    documentVersionId: string
    attemptId: string
    embeddingDimension: number
    embeddingSpaceKey: string
    projectedChecksum: string
    projectedChunkCount: number
  }): Promise<'completed' | 'stale'> {
    return this.prisma.$transaction(async (transaction) => {
      await transaction.$queryRaw(
        Prisma.sql`SELECT "id" FROM "knowledge_document_versions" WHERE "id" = ${options.documentVersionId}::uuid FOR UPDATE`,
      )
      const version = await transaction.knowledgeDocumentVersion.findUnique({
        where: { id: options.documentVersionId },
        select: {
          id: true,
          documentId: true,
          knowledgeBaseId: true,
          knowledgeBaseIndexId: true,
          status: true,
          segmentationMode: true,
          chunkConfig: true,
          cleaningConfig: true,
          characterCount: true,
          chunkCount: true,
          projection: {
            select: {
              status: true,
              expectedChunkCount: true,
              expectedChecksum: true,
            },
          },
          knowledgeBaseIndex: {
            select: {
              status: true,
              embeddingDimension: true,
              embeddingSpaceKey: true,
            },
          },
        },
      })
      if (
        !version ||
        version.status !== 'EMBEDDING' ||
        !['BUILDING', 'READY'].includes(version.knowledgeBaseIndex.status) ||
        !version.projection ||
        version.projection.status !== 'WRITING' ||
        version.projection.expectedChunkCount !== options.projectedChunkCount ||
        version.projection.expectedChecksum !== options.projectedChecksum
      ) {
        return 'stale'
      }
      if (
        (version.knowledgeBaseIndex.embeddingDimension !== null &&
          version.knowledgeBaseIndex.embeddingDimension !== options.embeddingDimension) ||
        (version.knowledgeBaseIndex.embeddingSpaceKey !== null &&
          version.knowledgeBaseIndex.embeddingSpaceKey !== options.embeddingSpaceKey)
      ) {
        throw new Error('索引代际的 Embedding 空间发生冲突')
      }

      const vectorRows = await transaction.$queryRaw<Array<{ count: number }>>(
        Prisma.sql`
          SELECT COUNT(*)::int AS "count"
          FROM "knowledge_chunks"
          WHERE "documentVersionId" = ${version.id}::uuid
            AND "knowledgeBaseIndexId" = ${version.knowledgeBaseIndexId}::uuid
            AND "embedding" IS NOT NULL
            AND "embeddingDimension" = ${options.embeddingDimension}
            AND vector_dims("embedding") = ${options.embeddingDimension}
        `,
      )
      if ((vectorRows[0]?.count ?? 0) !== options.projectedChunkCount) {
        throw new Error('pgvector 向量写入完整性校验失败')
      }

      await transaction.knowledgeBaseIndex.update({
        where: { id: version.knowledgeBaseIndexId },
        data: {
          embeddingDimension: options.embeddingDimension,
          embeddingSpaceKey: options.embeddingSpaceKey,
        },
      })
      await transaction.knowledgeSearchProjection.update({
        where: { documentVersionId: version.id },
        data: {
          status: 'READY',
          projectedChunkCount: options.projectedChunkCount,
          projectedChecksum: options.projectedChecksum,
          readyAt: new Date(),
        },
      })
      await transaction.knowledgeDocumentVersion.update({
        where: { id: version.id },
        data: { status: 'READY', progress: 100, readyAt: new Date() },
      })
      const chunkConfig = parseChunkConfig(version.chunkConfig),
        cleaningConfig = parseCleaningConfig(version.cleaningConfig),
        settings = await transaction.knowledgeBaseSettings.findUnique({
          where: { knowledgeBaseId: version.knowledgeBaseId },
          select: { segmentationRevision: true },
        }),
        knowledgeBase = await transaction.knowledgeBase.findUnique({
          where: { id: version.knowledgeBaseId },
          select: { activeIndexId: true },
        })
      if (
        !knowledgeBase?.activeIndexId ||
        knowledgeBase.activeIndexId === version.knowledgeBaseIndexId
      ) {
        await transaction.knowledgeDocument.update({
          where: { id: version.documentId },
          data: {
            status: 'READY',
            segmentationMode: version.segmentationMode,
            maxSegmentLength: chunkConfig.maxSegmentLength,
            overlapLength: chunkConfig.overlapLength,
            normalizeWhitespace: cleaningConfig.normalizeWhitespace,
            indexedSegmentationRevision: settings?.segmentationRevision ?? 1,
            characterCount: version.characterCount ?? 0,
            chunkCount: version.chunkCount ?? options.projectedChunkCount,
            errorMessage: null,
          },
        })
      }
      await transaction.knowledgeDocumentIndexHead.upsert({
        where: {
          documentId_knowledgeBaseIndexId: {
            documentId: version.documentId,
            knowledgeBaseIndexId: version.knowledgeBaseIndexId,
          },
        },
        create: {
          knowledgeBaseId: version.knowledgeBaseId,
          documentId: version.documentId,
          knowledgeBaseIndexId: version.knowledgeBaseIndexId,
          currentVersionId: version.id,
        },
        update: { currentVersionId: version.id },
      })
      await transaction.knowledgeIngestionAttempt.updateMany({
        where: { id: options.attemptId, status: 'RUNNING' },
        data: {
          status: 'SUCCEEDED',
          stage: 'PROJECTION',
          heartbeatAt: new Date(),
          finishedAt: new Date(),
        },
      })

      await this.finalizeIndexBuildIfSettled(
        transaction,
        version.knowledgeBaseIndexId,
        version.knowledgeBaseId,
      )
      return 'completed'
    })
  }

  async failProjection(options: {
    documentVersionId: string
    attemptId: string
    errorMessage: string
    retryable: boolean
  }): Promise<void> {
    await this.prisma.$transaction(async (transaction) => {
      const version = await transaction.knowledgeDocumentVersion.findUnique({
        where: { id: options.documentVersionId },
        select: {
          documentId: true,
          knowledgeBaseId: true,
          knowledgeBaseIndexId: true,
        },
      })
      if (!version) return

      await transaction.knowledgeSearchProjection.updateMany({
        where: {
          documentVersionId: options.documentVersionId,
          status: 'WRITING',
        },
        data: {
          status: options.retryable ? 'PENDING' : 'FAILED',
          errorCode: 'PROJECTION_FAILED',
          errorMessage: options.errorMessage.slice(0, 4000),
        },
      })
      const updatedVersion = await transaction.knowledgeDocumentVersion.updateMany({
        where: { id: options.documentVersionId, status: 'EMBEDDING' },
        data: {
          status: options.retryable ? 'EMBEDDING' : 'FAILED',
          errorCode: 'PROJECTION_FAILED',
          errorMessage: options.errorMessage.slice(0, 4000),
        },
      })
      await transaction.knowledgeIngestionAttempt.updateMany({
        where: { id: options.attemptId, status: 'RUNNING' },
        data: {
          status: 'FAILED',
          retryable: options.retryable,
          errorCode: 'PROJECTION_FAILED',
          errorMessage: options.errorMessage.slice(0, 4000),
          finishedAt: new Date(),
        },
      })
      if (!options.retryable && updatedVersion.count > 0) {
        await transaction.knowledgeDocument.update({
          where: { id: version.documentId },
          data: {
            status: 'FAILED',
            errorMessage: options.errorMessage.slice(0, 4000),
          },
        })
        await this.finalizeIndexBuildIfSettled(
          transaction,
          version.knowledgeBaseIndexId,
          version.knowledgeBaseId,
        )
      }
    })
  }

  private async finalizeIndexBuildIfSettled(
    transaction: Prisma.TransactionClient,
    knowledgeBaseIndexId: string,
    knowledgeBaseId: string,
  ): Promise<void> {
    await transaction.$queryRaw(
      Prisma.sql`SELECT "id" FROM "knowledge_base_indexes" WHERE "id" = ${knowledgeBaseIndexId}::uuid FOR UPDATE`,
    )
    const index = await transaction.knowledgeBaseIndex.findUnique({
      where: { id: knowledgeBaseIndexId },
      select: { status: true },
    })
    if (!index || index.status !== 'BUILDING') return

    const [processingCount, readyCount] = await Promise.all([
      transaction.knowledgeDocumentVersion.count({
        where: {
          knowledgeBaseIndexId,
          status: { in: ['QUEUED', 'PARSING', 'CHUNKING', 'EMBEDDING'] },
        },
      }),
      transaction.knowledgeDocumentVersion.count({
        where: { knowledgeBaseIndexId, status: 'READY' },
      }),
    ])
    if (processingCount > 0) return

    if (readyCount === 0) {
      await transaction.knowledgeBaseIndex.update({
        where: { id: knowledgeBaseIndexId },
        data: {
          status: 'FAILED',
          errorCode: 'NO_RETRIEVABLE_DOCUMENTS',
          errorMessage: '索引构建未产生可用文档',
          retiredAt: new Date(),
        },
      })
      return
    }

    const previous = await transaction.knowledgeBase.findUnique({
      where: { id: knowledgeBaseId },
      select: { activeIndexId: true },
    })
    if (previous?.activeIndexId && previous.activeIndexId !== knowledgeBaseIndexId) {
      await transaction.knowledgeBaseIndex.update({
        where: { id: previous.activeIndexId },
        data: { retiredAt: new Date() },
      })
    }
    await transaction.knowledgeBaseIndex.update({
      where: { id: knowledgeBaseIndexId },
      data: {
        status: 'READY',
        errorCode: null,
        errorMessage: null,
        readyAt: new Date(),
        activatedAt: new Date(),
        retiredAt: null,
      },
    })
    await transaction.knowledgeBase.update({
      where: { id: knowledgeBaseId },
      data: { activeIndexId: knowledgeBaseIndexId },
    })
    const readyHeads = await transaction.knowledgeDocumentIndexHead.findMany({
      where: { knowledgeBaseIndexId },
      select: { documentId: true },
    })
    if (readyHeads.length > 0) {
      await transaction.knowledgeDocument.updateMany({
        where: { id: { in: readyHeads.map(({ documentId }) => documentId) } },
        data: { status: 'READY', errorMessage: null },
      })
    }
  }

  async failIndexBuild(knowledgeBaseIndexId: string, errorMessage: string): Promise<void> {
    await this.prisma.$transaction(async (transaction) => {
      const index = await transaction.knowledgeBaseIndex.findUnique({
        where: { id: knowledgeBaseIndexId },
        select: { knowledgeBase: { select: { activeIndexId: true } } },
      })
      if (!index) return

      const updated = await transaction.knowledgeBaseIndex.updateMany({
        where: { id: knowledgeBaseIndexId, status: 'BUILDING' },
        data: {
          status: 'FAILED',
          errorCode: 'INDEX_BUILD_DISPATCH_FAILED',
          errorMessage: errorMessage.slice(0, 4000),
          retiredAt: new Date(),
        },
      })
      if (!updated.count) return

      const runningVersions = await transaction.knowledgeDocumentVersion.findMany({
          where: {
            knowledgeBaseIndexId,
            status: { in: ['QUEUED', 'PARSING', 'CHUNKING', 'EMBEDDING'] },
          },
          select: { id: true, documentId: true },
        }),
        versionIds = runningVersions.map(({ id }) => id)
      await transaction.knowledgeDocumentVersion.updateMany({
        where: { id: { in: versionIds } },
        data: { status: 'CANCELLED', errorCode: 'INDEX_BUILD_FAILED' },
      })
      await transaction.knowledgeIngestionAttempt.updateMany({
        where: { documentVersionId: { in: versionIds }, status: 'RUNNING' },
        data: {
          status: 'CANCELLED',
          retryable: false,
          errorCode: 'INDEX_BUILD_FAILED',
          finishedAt: new Date(),
        },
      })
      if (!index.knowledgeBase.activeIndexId) {
        await transaction.knowledgeDocument.updateMany({
          where: {
            id: { in: runningVersions.map(({ documentId }) => documentId) },
          },
          data: {
            status: 'FAILED',
            errorMessage: errorMessage.slice(0, 4000),
          },
        })
      }
    })
  }
}

function parseChunkConfig(value: Prisma.JsonValue): {
  segmentationMode: 'GENERAL' | 'QA' | 'PARENT_CHILD'
  maxSegmentLength: number
  overlapLength: number
} {
  if (!isRecord(value)) throw new Error('索引分段配置损坏')
  const segmentationMode = value.segmentationMode,
    maxSegmentLength = value.maxSegmentLength,
    overlapLength = value.overlapLength
  if (
    !['GENERAL', 'QA', 'PARENT_CHILD'].includes(String(segmentationMode)) ||
    !Number.isSafeInteger(maxSegmentLength) ||
    !Number.isSafeInteger(overlapLength)
  ) {
    throw new Error('索引分段配置损坏')
  }
  return {
    segmentationMode: segmentationMode as 'GENERAL' | 'QA' | 'PARENT_CHILD',
    maxSegmentLength: maxSegmentLength as number,
    overlapLength: overlapLength as number,
  }
}

function parseCleaningConfig(value: Prisma.JsonValue): {
  normalizeWhitespace: boolean
} {
  if (!isRecord(value) || typeof value.normalizeWhitespace !== 'boolean') {
    throw new Error('索引清洗配置损坏')
  }
  return { normalizeWhitespace: value.normalizeWhitespace }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}
