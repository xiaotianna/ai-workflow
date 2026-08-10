import type {
  KnowledgeBaseSort,
  KnowledgeRetrievalProfileDto,
  KnowledgeSegmentationModeDto,
} from '@/dto/knowledge-base.dto'
import { Prisma } from '@/generated/prisma/client'
import { PrismaService } from '@/infra/prisma/prisma.service'
import { Injectable } from '@nestjs/common'

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
      settings: {
        select: {
          segmentationRevision: true,
        },
      },
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
  segmentationMode: KnowledgeSegmentationModeDto
  maxSegmentLength: number
  overlapLength: number
  normalizeWhitespace: boolean
  retrievalProfile: KnowledgeRetrievalProfileDto
  retrievalTopK: number
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
  ): Promise<{ settings: KnowledgeBaseSettingsRecord; staleDocumentCount: number } | null> {
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
  ): Promise<{ settings: KnowledgeBaseSettingsRecord; staleDocumentCount: number } | null> {
    return this.prisma.$transaction(async (transaction) => {
      const current = await transaction.knowledgeBaseSettings.findFirst({
        where: { knowledgeBaseId, knowledgeBase: { ownerId } },
        select: knowledgeBaseSettingsSelect,
      })
      if (!current) return null

      const segmentationChanged =
        current.segmentationMode !== options.segmentationMode ||
        current.maxSegmentLength !== options.maxSegmentLength ||
        current.overlapLength !== options.overlapLength ||
        current.normalizeWhitespace !== options.normalizeWhitespace

      const settings = await transaction.knowledgeBaseSettings.update({
        where: { knowledgeBaseId },
        data: {
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

      const staleDocumentCount = await transaction.knowledgeDocument.count({
        where: {
          knowledgeBaseId,
          indexedSegmentationRevision: { lt: settings.segmentationRevision },
        },
      })

      return { settings, staleDocumentCount }
    })
  }

  async listDocuments(options: {
    ownerId: string
    knowledgeBaseId: string
    search?: string
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
    }
    const [items, total] = await Promise.all([
      this.prisma.knowledgeDocument.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
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
      const settings = await transaction.knowledgeBaseSettings.findFirstOrThrow({
        where: {
          knowledgeBaseId: options.knowledgeBaseId,
          knowledgeBase: { ownerId: options.ownerId },
        },
        select: { segmentationRevision: true },
      })

      return transaction.knowledgeDocument.create({
        data: {
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
          status: 'READY',
          characterCount: options.characterCount,
          chunkCount: options.chunks.length,
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

      await transaction.knowledgeChunk.deleteMany({ where: { documentId: document.id } })
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

    const where = {
      documentId: options.documentId,
      ...(options.search
        ? { content: { contains: options.search, mode: 'insensitive' as const } }
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
