import { Prisma } from '@/generated/prisma/client'
import { PrismaService } from '@/infra/prisma/prisma.service'
import { Injectable } from '@nestjs/common'

const retrievalIndexSelect = {
  id: true,
  status: true,
  knowledgeBaseId: true,
  embeddingProvider: true,
  embeddingModelId: true,
  embeddingDimension: true,
  embeddingSpaceKey: true,
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
  knowledgeBase: {
    select: {
      settings: { select: { retrievalProfile: true } },
    },
  },
} satisfies Prisma.KnowledgeBaseIndexSelect

export type KnowledgeRetrievalIndex = Prisma.KnowledgeBaseIndexGetPayload<{
  select: typeof retrievalIndexSelect
}>

export interface KnowledgeRetrievalState {
  id: string
  activeIndexId: string | null
  embeddingModelConfigured: boolean
  latestIndexStatus?: 'BUILDING' | 'READY' | 'FAILED' | 'CANCELLED'
}

export interface RetrievableKnowledgeChunk {
  documentVersionId: string
  metadata: Record<string, unknown>
}

export interface KnowledgeRetrievalMetadataField {
  id: string
  type: string
}

interface RetrievableKnowledgeChunkRow {
  chunkId: string
  documentVersionId: string
  chunkMetadata: Prisma.JsonValue
  documentMetadata: Prisma.JsonValue
}

@Injectable()
export class KnowledgeRetrievalRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findActiveIndexes(
    ownerId: string,
    knowledgeBaseIds: string[],
  ): Promise<KnowledgeRetrievalIndex[]> {
    const knowledgeBases = await this.prisma.knowledgeBase.findMany({
        where: {
          id: { in: knowledgeBaseIds },
          ownerId,
          lifecycleStatus: 'ACTIVE',
        },
        select: {
          id: true,
          activeIndex: { select: retrievalIndexSelect },
        },
      }),
      byId = new Map(knowledgeBases.map((knowledgeBase) => [knowledgeBase.id, knowledgeBase]))
    return knowledgeBaseIds.flatMap((knowledgeBaseId) => {
      const index = byId.get(knowledgeBaseId)?.activeIndex
      return index?.status === 'READY' ? [index] : []
    })
  }

  async findRetrievalStates(
    ownerId: string,
    knowledgeBaseIds: string[],
  ): Promise<KnowledgeRetrievalState[]> {
    const knowledgeBases = await this.prisma.knowledgeBase.findMany({
      where: {
        id: { in: knowledgeBaseIds },
        ownerId,
        lifecycleStatus: 'ACTIVE',
      },
      select: {
        id: true,
        activeIndexId: true,
        settings: {
          select: {
            embeddingModelGroupId: true,
            embeddingConfiguredModelId: true,
          },
        },
        indexes: {
          orderBy: { generation: 'desc' },
          take: 1,
          select: { status: true },
        },
      },
    })

    return knowledgeBases.map((knowledgeBase) => ({
      id: knowledgeBase.id,
      activeIndexId: knowledgeBase.activeIndexId,
      embeddingModelConfigured: Boolean(
        knowledgeBase.settings?.embeddingModelGroupId &&
        knowledgeBase.settings.embeddingConfiguredModelId,
      ),
      ...(knowledgeBase.indexes[0] ? { latestIndexStatus: knowledgeBase.indexes[0].status } : {}),
    }))
  }

  async findRetrievableVersionIds(
    ownerId: string,
    documentVersionIds: string[],
  ): Promise<Set<string>> {
    if (!documentVersionIds.length) return new Set()

    const heads = await this.prisma.knowledgeDocumentIndexHead.findMany({
      where: {
        currentVersionId: { in: documentVersionIds },
        document: {
          enabled: true,
          status: 'READY',
          lifecycleStatus: 'ACTIVE',
          knowledgeBase: {
            ownerId,
            lifecycleStatus: 'ACTIVE',
          },
        },
        knowledgeBaseIndex: {
          status: 'READY',
          activeForKnowledgeBase: {
            ownerId,
            lifecycleStatus: 'ACTIVE',
          },
        },
        currentVersion: {
          status: 'READY',
          projection: { status: 'READY' },
        },
      },
      select: { currentVersionId: true },
    })

    return new Set(heads.map(({ currentVersionId }) => currentVersionId))
  }

  async findEnabledChunkIds(chunkIds: string[]): Promise<Set<string>> {
    if (!chunkIds.length) return new Set()

    const chunks = await this.prisma.knowledgeChunk.findMany({
      where: { id: { in: chunkIds }, enabled: true },
      select: { id: true },
    })
    return new Set(chunks.map(({ id }) => id))
  }

  async findRetrievableChunks(
    ownerId: string,
    chunkIds: string[],
    metadataFilter?: Record<string, string | number>,
  ): Promise<Map<string, RetrievableKnowledgeChunk>> {
    if (!chunkIds.length) return new Map()

    const filter = metadataFilter
        ? Prisma.sql`AND document."metadata" @> ${JSON.stringify(metadataFilter)}::jsonb`
        : Prisma.sql``,
      rows = await this.prisma.$queryRaw<RetrievableKnowledgeChunkRow[]>(
        Prisma.sql`
        SELECT
          chunk."id" AS "chunkId",
          version."id" AS "documentVersionId",
          chunk."metadata" AS "chunkMetadata",
          document."metadata" AS "documentMetadata"
        FROM "knowledge_chunks" AS chunk
        INNER JOIN "knowledge_documents" AS document
          ON document."id" = chunk."documentId"
        INNER JOIN "knowledge_document_versions" AS version
          ON version."id" = chunk."documentVersionId"
        INNER JOIN "knowledge_base_indexes" AS knowledge_index
          ON knowledge_index."id" = chunk."knowledgeBaseIndexId"
        INNER JOIN "knowledge_bases" AS knowledge_base
          ON knowledge_base."id" = knowledge_index."knowledgeBaseId"
        INNER JOIN "knowledge_document_index_heads" AS head
          ON head."documentId" = document."id"
          AND head."knowledgeBaseIndexId" = knowledge_index."id"
          AND head."currentVersionId" = version."id"
        INNER JOIN "knowledge_search_projections" AS projection
          ON projection."documentVersionId" = version."id"
          AND projection."knowledgeBaseIndexId" = knowledge_index."id"
        WHERE knowledge_base."ownerId" = ${ownerId}::uuid
          AND chunk."id" IN (${uuidList(chunkIds)})
          AND knowledge_base."activeIndexId" = knowledge_index."id"
          AND knowledge_base."lifecycleStatus" = 'ACTIVE'
          AND knowledge_index."status" = 'READY'
          AND document."lifecycleStatus" = 'ACTIVE'
          AND document."status" = 'READY'
          AND document."enabled" = true
          AND version."status" = 'READY'
          AND projection."status" = 'READY'
          AND chunk."enabled" = true
          ${filter}
      `,
      )

    return new Map(
      rows.map((row) => [
        row.chunkId,
        {
          documentVersionId: row.documentVersionId,
          metadata: {
            ...asRecord(row.documentMetadata),
            ...asRecord(row.chunkMetadata),
          },
        },
      ]),
    )
  }

  findMetadataFields(
    ownerId: string,
    knowledgeBaseIds: string[],
    fieldIds: string[],
  ): Promise<KnowledgeRetrievalMetadataField[]> {
    return this.prisma.knowledgeMetadataField.findMany({
      where: {
        id: { in: fieldIds },
        knowledgeBaseId: { in: knowledgeBaseIds },
        knowledgeBase: { ownerId, lifecycleStatus: 'ACTIVE' },
      },
      select: { id: true, type: true },
    })
  }

  async recordWorkflowRetrieval(options: {
    ownerId: string
    commandId: string
    queryHash: string
    latencyMs: number
    hits: Array<{
      documentId: string
      firstChunkId: string
      documentVersionId: string
      rank: number
      scoreSnapshot: number
      matchedChunkCount: number
    }>
  }): Promise<void> {
    await this.prisma.knowledgeRetrievalLog.upsert({
      where: {
        source_sourceRequestId: {
          source: 'WORKFLOW',
          sourceRequestId: options.commandId,
        },
      },
      create: {
        ownerId: options.ownerId,
        sourceRequestId: options.commandId,
        source: 'WORKFLOW',
        queryHash: options.queryHash,
        latencyMs: options.latencyMs,
        hits: {
          create: options.hits,
        },
      },
      update: {},
    })
  }
}

function uuidList(ids: string[]): Prisma.Sql {
  return Prisma.join(ids.map((id) => Prisma.sql`${id}::uuid`))
}

function asRecord(value: Prisma.JsonValue): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}
}
