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
}
