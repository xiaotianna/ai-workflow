import type { KnowledgeBaseSort } from '@/dto/knowledge-base.dto'
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
      },
      select: knowledgeBaseSelect,
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
