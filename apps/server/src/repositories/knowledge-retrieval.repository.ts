import { Prisma } from '@/generated/prisma/client'
import { PrismaService } from '@/infra/prisma/prisma.service'
import { Injectable } from '@nestjs/common'

const retrievalIndexSelect = {
  id: true,
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
    })
    const byId = new Map(knowledgeBases.map((knowledgeBase) => [knowledgeBase.id, knowledgeBase]))
    return knowledgeBaseIds.flatMap((knowledgeBaseId) => {
      const index = byId.get(knowledgeBaseId)?.activeIndex
      return index ? [index] : []
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
