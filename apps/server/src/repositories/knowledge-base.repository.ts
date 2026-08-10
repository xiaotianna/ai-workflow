import type {
  KnowledgeBaseSort,
  KnowledgeRetrievalProfileDto,
  KnowledgeSegmentationModeDto,
} from '@/dto/knowledge-base.dto'
import { Prisma } from '@/generated/prisma/client'
import { PrismaService } from '@/infra/prisma/prisma.service'
import { Injectable } from '@nestjs/common'
import { createHash, randomUUID } from 'node:crypto'

export const knowledgeBaseSelect = {
  id: true,
  name: true,
  description: true,
  icon: true,
  createdAt: true,
  updatedAt: true,
  owner: {
    select: {
      username: true,
    },
  },
} satisfies Prisma.KnowledgeBaseSelect

export type KnowledgeBaseRecord = Prisma.KnowledgeBaseGetPayload<{
  select: typeof knowledgeBaseSelect
}>

export const knowledgeBaseSettingsSelect = {
  knowledgeBaseId: true,
  embeddingModelGroupId: true,
  embeddingConfiguredModelId: true,
  segmentationMode: true,
  maxSegmentLength: true,
  overlapLength: true,
  normalizeWhitespace: true,
  segmentationRevision: true,
  retrievalProfile: true,
  retrievalTopK: true,
  updatedAt: true,
} satisfies Prisma.KnowledgeBaseSettingsSelect

export type KnowledgeBaseSettingsRecord = Prisma.KnowledgeBaseSettingsGetPayload<{
  select: typeof knowledgeBaseSettingsSelect
}>

export const knowledgeBaseIndexSelect = {
  id: true,
  generation: true,
  configuredModelId: true,
  embeddingProvider: true,
  embeddingModelId: true,
  embeddingDimension: true,
  embeddingSpaceKey: true,
  distanceMetric: true,
  configHash: true,
  status: true,
  errorCode: true,
  errorMessage: true,
  createdAt: true,
  readyAt: true,
  activatedAt: true,
  retiredAt: true,
} satisfies Prisma.KnowledgeBaseIndexSelect

export type KnowledgeBaseIndexRecord = Prisma.KnowledgeBaseIndexGetPayload<{
  select: typeof knowledgeBaseIndexSelect
}>

export const knowledgeDocumentSelect = {
  id: true,
  knowledgeBaseId: true,
  name: true,
  fileType: true,
  sourceStorageKey: true,
  sourceMimeType: true,
  sourceSize: true,
  sourceChecksum: true,
  segmentationMode: true,
  maxSegmentLength: true,
  overlapLength: true,
  normalizeWhitespace: true,
  indexedSegmentationRevision: true,
  status: true,
  enabled: true,
  characterCount: true,
  chunkCount: true,
  errorMessage: true,
  createdAt: true,
  updatedAt: true,
  knowledgeBase: {
    select: {
      activeIndexId: true,
      settings: {
        select: {
          segmentationRevision: true,
        },
      },
    },
  },
  _count: {
    select: {
      retrievalHits: true,
    },
  },
} satisfies Prisma.KnowledgeDocumentSelect

export type KnowledgeDocumentRecord = Prisma.KnowledgeDocumentGetPayload<{
  select: typeof knowledgeDocumentSelect
}>

export const knowledgeChunkSelect = {
  id: true,
  sequence: true,
  content: true,
  tokenCount: true,
  metadata: true,
  createdAt: true,
} satisfies Prisma.KnowledgeChunkSelect

export type KnowledgeChunkRecord = Prisma.KnowledgeChunkGetPayload<{
  select: typeof knowledgeChunkSelect
}>

interface ListKnowledgeBasesOptions {
  ownerId: string
  search?: string
  sort: KnowledgeBaseSort
}

interface CreateKnowledgeBaseOptions {
  ownerId: string
  title: string
  description?: string
  icon: string
}

interface UpdateKnowledgeBaseOptions {
  title?: string
  description?: string | null
  icon?: string
}

interface UpdateKnowledgeBaseSettingsOptions {
  embeddingModelGroupId: string | null
  embeddingConfiguredModelId: string | null
  segmentationMode: KnowledgeSegmentationModeDto
  maxSegmentLength: number
  overlapLength: number
  normalizeWhitespace: boolean
  retrievalProfile: KnowledgeRetrievalProfileDto
  retrievalTopK: number
  indexSnapshot?: {
    configuredModelId: string
    embeddingProvider: string
    embeddingModelId: string
    defaultChunkConfig: Prisma.InputJsonValue
    defaultCleaningConfig: Prisma.InputJsonValue
    configHash: string
  }
}

interface CreateKnowledgeDocumentOptions {
  ownerId: string
  knowledgeBaseId: string
  name: string
  fileType: string
  sourceStorageKey: string
  sourceMimeType: string
  sourceSize: bigint
  sourceChecksum: string
  segmentationMode: KnowledgeSegmentationModeDto
  maxSegmentLength: number
  overlapLength: number
  normalizeWhitespace: boolean
  characterCount: number
  chunks: Array<{
    content: string
    tokenCount: number
    metadata: Prisma.InputJsonValue
  }>
}

@Injectable()
export class KnowledgeBaseRepository {
  constructor(private readonly prisma: PrismaService) {}

  list(options: ListKnowledgeBasesOptions): Promise<KnowledgeBaseRecord[]> {
    const sortField = options.sort === 'updated_desc' ? 'updatedAt' : 'createdAt'
    const direction = options.sort === 'created_asc' ? 'asc' : 'desc'

    return this.prisma.knowledgeBase.findMany({
      where: {
        ownerId: options.ownerId,
        ...(options.search
          ? {
              name: {
                contains: options.search,
                mode: 'insensitive' as const,
              },
            }
          : {}),
      },
      orderBy: [{ [sortField]: direction }, { id: direction }],
      select: knowledgeBaseSelect,
    })
  }

  findById(ownerId: string, knowledgeBaseId: string): Promise<KnowledgeBaseRecord | null> {
    return this.prisma.knowledgeBase.findFirst({
      where: {
        id: knowledgeBaseId,
        ownerId,
      },
      select: knowledgeBaseSelect,
    })
  }

  create(options: CreateKnowledgeBaseOptions): Promise<KnowledgeBaseRecord> {
    return this.prisma.knowledgeBase.create({
      data: {
        ownerId: options.ownerId,
        name: options.title,
        description: options.description,
        icon: options.icon,
        settings: {
          create: {},
        },
      },
      select: knowledgeBaseSelect,
    })
  }

  async getSettings(
    ownerId: string,
    knowledgeBaseId: string,
  ): Promise<{
    settings: KnowledgeBaseSettingsRecord
    staleDocumentCount: number
  } | null> {
    const settings = await this.prisma.knowledgeBaseSettings.findFirst({
      where: {
        knowledgeBaseId,
        knowledgeBase: { ownerId },
      },
      select: knowledgeBaseSettingsSelect,
    })
    if (!settings) return null

    const staleDocumentCount = await this.prisma.knowledgeDocument.count({
      where: {
        knowledgeBaseId,
        indexedSegmentationRevision: { lt: settings.segmentationRevision },
      },
    })

    return { settings, staleDocumentCount }
  }

  async updateSettings(
    ownerId: string,
    knowledgeBaseId: string,
    options: UpdateKnowledgeBaseSettingsOptions,
  ): Promise<{
    settings: KnowledgeBaseSettingsRecord
    staleDocumentCount: number
  } | null> {
    return this.prisma.$transaction(async (transaction) => {
      const current = await transaction.knowledgeBaseSettings.findFirst({
        where: { knowledgeBaseId, knowledgeBase: { ownerId } },
        select: knowledgeBaseSettingsSelect,
      })
      if (!current) return null

      await transaction.$queryRaw(
        Prisma.sql`SELECT "id" FROM "knowledge_bases" WHERE "id" = ${knowledgeBaseId}::uuid FOR UPDATE`,
      )

      const segmentationChanged =
        current.segmentationMode !== options.segmentationMode ||
        current.maxSegmentLength !== options.maxSegmentLength ||
        current.overlapLength !== options.overlapLength ||
        current.normalizeWhitespace !== options.normalizeWhitespace

      const settings = await transaction.knowledgeBaseSettings.update({
        where: { knowledgeBaseId },
        data: {
          embeddingModelGroupId: options.embeddingModelGroupId,
          embeddingConfiguredModelId: options.embeddingConfiguredModelId,
          segmentationMode: options.segmentationMode,
          maxSegmentLength: options.maxSegmentLength,
          overlapLength: options.overlapLength,
          normalizeWhitespace: options.normalizeWhitespace,
          retrievalProfile: options.retrievalProfile,
          retrievalTopK: options.retrievalTopK,
          ...(segmentationChanged ? { segmentationRevision: { increment: 1 } } : {}),
        },
        select: knowledgeBaseSettingsSelect,
      })

      if (options.indexSnapshot) {
        await transaction.knowledgeBaseIndex.updateMany({
          where: { knowledgeBaseId, status: 'BUILDING' },
          data: { status: 'CANCELLED', retiredAt: new Date() },
        })

        const latestIndex = await transaction.knowledgeBaseIndex.findFirst({
          where: { knowledgeBaseId },
          orderBy: { generation: 'desc' },
          select: { generation: true },
        })
        const indexId = randomUUID()
        const generation = (latestIndex?.generation ?? 0) + 1
        await transaction.knowledgeBaseIndex.create({
          data: {
            id: indexId,
            knowledgeBaseId,
            generation,
            configuredModelId: options.indexSnapshot.configuredModelId,
            embeddingProvider: options.indexSnapshot.embeddingProvider,
            embeddingModelId: options.indexSnapshot.embeddingModelId,
            defaultChunkConfig: options.indexSnapshot.defaultChunkConfig,
            defaultCleaningConfig: options.indexSnapshot.defaultCleaningConfig,
            configHash: options.indexSnapshot.configHash,
          },
        })
        await transaction.knowledgeOutboxEvent.create({
          data: {
            knowledgeBaseId,
            eventType: 'KNOWLEDGE_INDEX_BUILD_REQUESTED',
            aggregateType: 'KNOWLEDGE_BASE_INDEX',
            aggregateId: indexId,
            idempotencyKey: `knowledge-index-build:${indexId}`,
            payload: {
              knowledgeBaseIndexId: indexId,
            },
          },
        })
      }

      const staleDocumentCount = await transaction.knowledgeDocument.count({
        where: {
          knowledgeBaseId,
          indexedSegmentationRevision: { lt: settings.segmentationRevision },
        },
      })

      return { settings, staleDocumentCount }
    })
  }

  async listIndexes(
    ownerId: string,
    knowledgeBaseId: string,
  ): Promise<{
    activeIndexId: string | null
    items: KnowledgeBaseIndexRecord[]
  } | null> {
    const knowledgeBase = await this.prisma.knowledgeBase.findFirst({
      where: { id: knowledgeBaseId, ownerId },
      select: {
        activeIndexId: true,
        indexes: {
          orderBy: { generation: 'desc' },
          select: knowledgeBaseIndexSelect,
        },
      },
    })
    if (!knowledgeBase) return null

    return {
      activeIndexId: knowledgeBase.activeIndexId,
      items: knowledgeBase.indexes,
    }
  }

  async listDocuments(options: {
    ownerId: string
    knowledgeBaseId: string
    search?: string
    fileType?: 'pdf' | 'markdown' | 'text'
    sort: 'uploaded_desc' | 'recall_desc' | 'character_desc' | 'name_asc'
    page: number
    pageSize: number
  }): Promise<{ items: KnowledgeDocumentRecord[]; total: number } | null> {
    const knowledgeBase = await this.prisma.knowledgeBase.findFirst({
      where: { id: options.knowledgeBaseId, ownerId: options.ownerId },
      select: { id: true },
    })
    if (!knowledgeBase) return null

    const where = {
      knowledgeBaseId: options.knowledgeBaseId,
      ...(options.search
        ? { name: { contains: options.search, mode: 'insensitive' as const } }
        : {}),
      ...(options.fileType ? { fileType: options.fileType } : {}),
    }
    const orderBy: Prisma.KnowledgeDocumentOrderByWithRelationInput[] =
      options.sort === 'recall_desc'
        ? [{ retrievalHits: { _count: 'desc' } }, { createdAt: 'desc' }, { id: 'desc' }]
        : options.sort === 'character_desc'
          ? [{ characterCount: 'desc' }, { id: 'desc' }]
          : options.sort === 'name_asc'
            ? [{ name: 'asc' }, { id: 'asc' }]
            : [{ createdAt: 'desc' }, { id: 'desc' }]
    const [items, total] = await Promise.all([
      this.prisma.knowledgeDocument.findMany({
        where,
        orderBy,
        skip: (options.page - 1) * options.pageSize,
        take: options.pageSize,
        select: knowledgeDocumentSelect,
      }),
      this.prisma.knowledgeDocument.count({ where }),
    ])

    return { items, total }
  }

  findDocument(
    ownerId: string,
    knowledgeBaseId: string,
    documentId: string,
  ): Promise<KnowledgeDocumentRecord | null> {
    return this.prisma.knowledgeDocument.findFirst({
      where: {
        id: documentId,
        knowledgeBaseId,
        knowledgeBase: { ownerId },
      },
      select: knowledgeDocumentSelect,
    })
  }

  async createDocument(options: CreateKnowledgeDocumentOptions): Promise<KnowledgeDocumentRecord> {
    return this.prisma.$transaction(async (transaction) => {
      await transaction.$queryRaw(
        Prisma.sql`SELECT "id" FROM "knowledge_bases" WHERE "id" = ${options.knowledgeBaseId}::uuid FOR UPDATE`,
      )
      const settings = await transaction.knowledgeBaseSettings.findFirstOrThrow({
        where: {
          knowledgeBaseId: options.knowledgeBaseId,
          knowledgeBase: { ownerId: options.ownerId },
        },
        select: { segmentationRevision: true },
      })

      const knowledgeBase = await transaction.knowledgeBase.findUniqueOrThrow({
        where: { id: options.knowledgeBaseId },
        select: { activeIndexId: true },
      })
      const targetIndexes = await transaction.knowledgeBaseIndex.findMany({
        where: {
          knowledgeBaseId: options.knowledgeBaseId,
          OR: [
            { status: 'BUILDING' },
            ...(knowledgeBase.activeIndexId ? [{ id: knowledgeBase.activeIndexId }] : []),
          ],
        },
        select: { id: true, configHash: true },
      })
      const documentId = randomUUID()
      const sourceId = randomUUID()

      const document = await transaction.knowledgeDocument.create({
        data: {
          id: documentId,
          knowledgeBaseId: options.knowledgeBaseId,
          name: options.name,
          fileType: options.fileType,
          sourceStorageKey: options.sourceStorageKey,
          sourceMimeType: options.sourceMimeType,
          sourceSize: options.sourceSize,
          sourceChecksum: options.sourceChecksum,
          segmentationMode: options.segmentationMode,
          maxSegmentLength: options.maxSegmentLength,
          overlapLength: options.overlapLength,
          normalizeWhitespace: options.normalizeWhitespace,
          indexedSegmentationRevision: settings.segmentationRevision,
          status: targetIndexes.length ? 'PROCESSING' : 'READY',
          characterCount: options.characterCount,
          chunkCount: options.chunks.length,
          sources: {
            create: {
              id: sourceId,
              objectKey: options.sourceStorageKey,
              originalFileName: options.name,
              checksum: options.sourceChecksum,
              mimeType: options.sourceMimeType,
              fileSize: options.sourceSize,
            },
          },
          chunks: {
            create: options.chunks.map((chunk, index) => ({
              sequence: index + 1,
              content: chunk.content,
              tokenCount: chunk.tokenCount,
              metadata: chunk.metadata,
            })),
          },
        },
        select: knowledgeDocumentSelect,
      })

      const versionConfigHash = createHash('sha256')
        .update(
          JSON.stringify({
            segmentationMode: options.segmentationMode,
            maxSegmentLength: options.maxSegmentLength,
            overlapLength: options.overlapLength,
            normalizeWhitespace: options.normalizeWhitespace,
          }),
        )
        .digest('hex')
      await Promise.all(
        targetIndexes.map(async (index) => {
          const versionId = randomUUID()
          await transaction.knowledgeDocumentVersion.create({
            data: {
              id: versionId,
              knowledgeBaseId: options.knowledgeBaseId,
              documentId,
              sourceId,
              knowledgeBaseIndexId: index.id,
              version: 1,
              idempotencyKey: createHash('sha256')
                .update(
                  `${index.id}:${documentId}:${sourceId}:${options.sourceChecksum}:${index.configHash}:${versionConfigHash}`,
                )
                .digest('hex'),
              parserVersion: 'text-v1',
              cleanerVersion: 'conservative-v1',
              cleaningConfig: {
                normalizeWhitespace: options.normalizeWhitespace,
              },
              segmentationMode: options.segmentationMode,
              chunkConfig: {
                segmentationMode: options.segmentationMode,
                maxSegmentLength: options.maxSegmentLength,
                overlapLength: options.overlapLength,
              },
              configHash: versionConfigHash,
              projection: { create: { knowledgeBaseIndexId: index.id } },
            },
          })
          await transaction.knowledgeOutboxEvent.create({
            data: {
              knowledgeBaseId: options.knowledgeBaseId,
              eventType: 'KNOWLEDGE_DOCUMENT_VERSION_PROCESS_REQUESTED',
              aggregateType: 'KNOWLEDGE_DOCUMENT_VERSION',
              aggregateId: versionId,
              idempotencyKey: `knowledge-document-version-process:${versionId}`,
              payload: { documentVersionId: versionId },
            },
          })
        }),
      )
      return document
    })
  }

  async replaceDocumentChunks(options: {
    ownerId: string
    knowledgeBaseId: string
    documentId: string
    chunks: CreateKnowledgeDocumentOptions['chunks']
    characterCount: number
  }): Promise<KnowledgeDocumentRecord | null> {
    return this.prisma.$transaction(async (transaction) => {
      const document = await transaction.knowledgeDocument.findFirst({
        where: {
          id: options.documentId,
          knowledgeBaseId: options.knowledgeBaseId,
          knowledgeBase: { ownerId: options.ownerId },
        },
        select: {
          id: true,
          knowledgeBase: {
            select: {
              settings: { select: knowledgeBaseSettingsSelect },
            },
          },
        },
      })
      const settings = document?.knowledgeBase.settings
      if (!document || !settings) return null

      await transaction.knowledgeChunk.deleteMany({
        where: { documentId: document.id, documentVersionId: null },
      })
      await transaction.knowledgeChunk.createMany({
        data: options.chunks.map((chunk, index) => ({
          documentId: document.id,
          sequence: index + 1,
          content: chunk.content,
          tokenCount: chunk.tokenCount,
          metadata: chunk.metadata,
        })),
      })

      return transaction.knowledgeDocument.update({
        where: { id: document.id },
        data: {
          segmentationMode: settings.segmentationMode,
          maxSegmentLength: settings.maxSegmentLength,
          overlapLength: settings.overlapLength,
          normalizeWhitespace: settings.normalizeWhitespace,
          indexedSegmentationRevision: settings.segmentationRevision,
          status: 'READY',
          characterCount: options.characterCount,
          chunkCount: options.chunks.length,
          errorMessage: null,
        },
        select: knowledgeDocumentSelect,
      })
    })
  }

  async queueDocumentReindex(
    ownerId: string,
    knowledgeBaseId: string,
    documentId: string,
  ): Promise<{ document: KnowledgeDocumentRecord; queued: boolean } | null> {
    return this.prisma.$transaction(async (transaction) => {
      await transaction.$queryRaw(
        Prisma.sql`SELECT "id" FROM "knowledge_documents" WHERE "id" = ${documentId}::uuid FOR UPDATE`,
      )
      const document = await transaction.knowledgeDocument.findFirst({
        where: { id: documentId, knowledgeBaseId, knowledgeBase: { ownerId } },
        select: {
          ...knowledgeDocumentSelect,
          sources: {
            orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
            take: 1,
            select: { id: true, checksum: true },
          },
          knowledgeBase: {
            select: {
              activeIndexId: true,
              settings: { select: knowledgeBaseSettingsSelect },
            },
          },
        },
      })
      if (!document) return null
      const activeIndexId = document.knowledgeBase.activeIndexId
      const settings = document.knowledgeBase.settings
      const source = document.sources[0]
      if (!activeIndexId || !settings || !source) {
        return { document, queued: false }
      }

      const pending = await transaction.knowledgeDocumentVersion.findFirst({
        where: {
          documentId,
          sourceId: source.id,
          knowledgeBaseIndexId: activeIndexId,
          status: { in: ['QUEUED', 'PARSING', 'CHUNKING', 'EMBEDDING'] },
        },
        select: { id: true },
      })
      if (pending) return { document, queued: true }

      const latest = await transaction.knowledgeDocumentVersion.findFirst({
        where: { documentId, knowledgeBaseIndexId: activeIndexId },
        orderBy: { version: 'desc' },
        select: { version: true },
      })
      const config = {
        segmentationMode: settings.segmentationMode,
        maxSegmentLength: settings.maxSegmentLength,
        overlapLength: settings.overlapLength,
        normalizeWhitespace: settings.normalizeWhitespace,
      }
      const configHash = createHash('sha256').update(JSON.stringify(config)).digest('hex')
      const versionId = randomUUID()
      const versionNumber = (latest?.version ?? 0) + 1
      await transaction.knowledgeDocumentVersion.create({
        data: {
          id: versionId,
          knowledgeBaseId,
          documentId,
          sourceId: source.id,
          knowledgeBaseIndexId: activeIndexId,
          version: versionNumber,
          idempotencyKey: createHash('sha256')
            .update(
              `${activeIndexId}:${documentId}:${source.id}:${source.checksum}:${configHash}:${versionNumber}`,
            )
            .digest('hex'),
          parserVersion: 'text-v1',
          cleanerVersion: 'conservative-v1',
          cleaningConfig: { normalizeWhitespace: settings.normalizeWhitespace },
          segmentationMode: settings.segmentationMode,
          chunkConfig: {
            segmentationMode: settings.segmentationMode,
            maxSegmentLength: settings.maxSegmentLength,
            overlapLength: settings.overlapLength,
          },
          configHash,
          projection: { create: { knowledgeBaseIndexId: activeIndexId } },
        },
      })
      await transaction.knowledgeOutboxEvent.create({
        data: {
          knowledgeBaseId,
          eventType: 'KNOWLEDGE_DOCUMENT_VERSION_PROCESS_REQUESTED',
          aggregateType: 'KNOWLEDGE_DOCUMENT_VERSION',
          aggregateId: versionId,
          idempotencyKey: `knowledge-document-version-process:${versionId}`,
          payload: { documentVersionId: versionId },
        },
      })
      const updated = await transaction.knowledgeDocument.update({
        where: { id: documentId },
        data: { status: 'PROCESSING', errorMessage: null },
        select: knowledgeDocumentSelect,
      })
      return { document: updated, queued: true }
    })
  }

  async listChunks(options: {
    ownerId: string
    knowledgeBaseId: string
    documentId: string
    search?: string
    page: number
    pageSize: number
  }): Promise<{
    document: KnowledgeDocumentRecord
    items: KnowledgeChunkRecord[]
    total: number
  } | null> {
    const document = await this.findDocument(
      options.ownerId,
      options.knowledgeBaseId,
      options.documentId,
    )
    if (!document) return null

    const activeHead = document.knowledgeBase.activeIndexId
      ? await this.prisma.knowledgeDocumentIndexHead.findUnique({
          where: {
            documentId_knowledgeBaseIndexId: {
              documentId: options.documentId,
              knowledgeBaseIndexId: document.knowledgeBase.activeIndexId,
            },
          },
          select: { currentVersionId: true },
        })
      : null

    const where = {
      documentId: options.documentId,
      ...(document.knowledgeBase.activeIndexId
        ? {
            documentVersionId: activeHead?.currentVersionId ?? null,
          }
        : { documentVersionId: null }),
      ...(options.search
        ? {
            content: { contains: options.search, mode: 'insensitive' as const },
          }
        : {}),
    }
    const [items, total] = await Promise.all([
      this.prisma.knowledgeChunk.findMany({
        where,
        orderBy: { sequence: 'asc' },
        skip: (options.page - 1) * options.pageSize,
        take: options.pageSize,
        select: knowledgeChunkSelect,
      }),
      this.prisma.knowledgeChunk.count({ where }),
    ])

    return { document, items, total }
  }

  async updateDocument(
    ownerId: string,
    knowledgeBaseId: string,
    documentId: string,
    data: { name?: string; enabled?: boolean },
  ): Promise<KnowledgeDocumentRecord | null> {
    const existing = await this.findDocument(ownerId, knowledgeBaseId, documentId)
    if (!existing) return null

    return this.prisma.knowledgeDocument.update({
      where: { id: documentId },
      data,
      select: knowledgeDocumentSelect,
    })
  }

  async removeDocument(
    ownerId: string,
    knowledgeBaseId: string,
    documentId: string,
  ): Promise<string | null> {
    const existing = await this.findDocument(ownerId, knowledgeBaseId, documentId)
    if (!existing) return null
    await this.prisma.knowledgeDocument.delete({ where: { id: documentId } })
    return existing.sourceStorageKey
  }

  listSourceStorageKeys(
    ownerId: string,
    knowledgeBaseId: string,
  ): Promise<Array<{ sourceStorageKey: string }>> {
    return this.prisma.knowledgeDocument.findMany({
      where: { knowledgeBaseId, knowledgeBase: { ownerId } },
      select: { sourceStorageKey: true },
    })
  }

  async findReferencedSourceStorageKeys(storageKeys: string[]): Promise<Set<string>> {
    if (!storageKeys.length) return new Set()

    const [sources, legacyDocuments] = await Promise.all([
      this.prisma.knowledgeDocumentSource.findMany({
        where: { objectKey: { in: storageKeys } },
        select: { objectKey: true },
      }),
      this.prisma.knowledgeDocument.findMany({
        where: { sourceStorageKey: { in: storageKeys } },
        select: { sourceStorageKey: true },
      }),
    ])
    return new Set([
      ...sources.map(({ objectKey }) => objectKey),
      ...legacyDocuments.map(({ sourceStorageKey }) => sourceStorageKey),
    ])
  }

  update(
    knowledgeBaseId: string,
    options: UpdateKnowledgeBaseOptions,
  ): Promise<KnowledgeBaseRecord> {
    return this.prisma.knowledgeBase.update({
      where: { id: knowledgeBaseId },
      data: {
        ...(options.title !== undefined ? { name: options.title } : {}),
        ...(options.description !== undefined ? { description: options.description } : {}),
        ...(options.icon !== undefined ? { icon: options.icon } : {}),
      },
      select: knowledgeBaseSelect,
    })
  }

  async hasOwnedWorkflowReference(ownerId: string, knowledgeBaseId: string): Promise<boolean> {
    const definitionFilters = this.createKnowledgeBaseReferenceFilters(knowledgeBaseId)
    const definitionWhere = {
      OR: definitionFilters.map((definition) => ({ definition })),
    }
    const workflowFilter = {
      app: {
        ownerId,
        deletedAt: null,
      },
    }
    const [draftReference, versionReference] = await Promise.all([
      this.prisma.workflowDraft.findFirst({
        where: {
          ...definitionWhere,
          workflow: workflowFilter,
        },
        select: { id: true },
      }),
      this.prisma.workflowVersion.findFirst({
        where: {
          ...definitionWhere,
          workflow: workflowFilter,
        },
        select: { id: true },
      }),
    ])

    return Boolean(draftReference || versionReference)
  }

  async remove(ownerId: string, knowledgeBaseId: string): Promise<boolean> {
    const result = await this.prisma.knowledgeBase.deleteMany({
      where: {
        id: knowledgeBaseId,
        ownerId,
      },
    })

    return result.count === 1
  }

  private createKnowledgeBaseReferenceFilters(knowledgeBaseId: string): Prisma.JsonFilter[] {
    return [
      {
        path: ['nodes'],
        array_contains: [
          {
            type: 'rag',
            config: {
              knowledgeBases: [{ id: knowledgeBaseId }],
            },
          },
        ],
      },
      {
        path: ['nodes'],
        array_contains: [
          {
            type: 'rag',
            config: {
              knowledgeBaseIds: [knowledgeBaseId],
            },
          },
        ],
      },
      {
        path: ['nodes'],
        array_contains: [
          {
            type: 'rag',
            config: {
              knowledgeBaseId,
            },
          },
        ],
      },
    ]
  }
}
