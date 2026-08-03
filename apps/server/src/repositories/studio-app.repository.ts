import type { StudioAppSort } from '@/dto/studio.dto'
import { PrismaService } from '@/infra/prisma/prisma.service'
import { Prisma } from '@/generated/prisma/client'
import { Injectable } from '@nestjs/common'

const studioAppSelect = {
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
} satisfies Prisma.AppSelect

interface StudioAppCursor {
  id: string
  value: Date
}

interface ListStudioAppsOptions {
  ownerId: string
  limit: number
  search?: string
  sort: StudioAppSort
  cursor?: StudioAppCursor
  publishedOnly?: boolean
}

interface CreateStudioAppOptions {
  appId: string
  workflowId: string
  ownerId: string
  title: string
  description?: string
  icon: string
  schemaVersion?: number
  definition: Prisma.InputJsonValue
  layout: Prisma.InputJsonValue
}

@Injectable()
export class StudioAppRepository {
  constructor(private readonly prisma: PrismaService) {}

  list(options: ListStudioAppsOptions) {
    const sortField = options.sort === 'updated_desc' ? 'updatedAt' : 'createdAt'
    const direction = options.sort === 'created_asc' ? 'asc' : 'desc'
    const cursorFilter = this.createCursorFilter(options.sort, options.cursor)

    return this.prisma.app.findMany({
      where: {
        ownerId: options.ownerId,
        deletedAt: null,
        ...(options.search
          ? {
              name: {
                contains: options.search,
                mode: 'insensitive' as const,
              },
            }
          : {}),
        ...(options.publishedOnly
          ? {
              workflow: {
                is: {
                  deployments: {
                    some: {},
                  },
                },
              },
            }
          : {}),
        ...cursorFilter,
      },
      orderBy: [{ [sortField]: direction }, { id: direction }],
      take: options.limit + 1,
      select: studioAppSelect,
    })
  }

  findById(ownerId: string, appId: string) {
    return this.prisma.app.findFirst({
      where: {
        id: appId,
        ownerId,
        deletedAt: null,
      },
      select: studioAppSelect,
    })
  }

  findForExport(ownerId: string, appId: string) {
    return this.prisma.app.findFirst({
      where: {
        id: appId,
        ownerId,
        deletedAt: null,
      },
      select: {
        id: true,
        name: true,
        description: true,
        icon: true,
        workflow: {
          select: {
            draft: {
              select: {
                schemaVersion: true,
                definition: true,
                layout: true,
                revision: true,
              },
            },
          },
        },
      },
    })
  }

  findForDuplicate(ownerId: string, appId: string) {
    return this.prisma.app.findFirst({
      where: {
        id: appId,
        ownerId,
        deletedAt: null,
      },
      select: {
        id: true,
        name: true,
        description: true,
        icon: true,
        workflow: {
          select: {
            draft: {
              select: {
                schemaVersion: true,
                definition: true,
                layout: true,
              },
            },
          },
        },
      },
    })
  }

  listNames(ownerId: string) {
    return this.prisma.app.findMany({
      where: {
        ownerId,
        deletedAt: null,
      },
      select: {
        name: true,
      },
    })
  }

  create(options: CreateStudioAppOptions) {
    return this.prisma.app.create({
      data: {
        id: options.appId,
        ownerId: options.ownerId,
        name: options.title,
        description: options.description,
        icon: options.icon,
        workflow: {
          create: {
            id: options.workflowId,
            draft: {
              create: {
                schemaVersion: options.schemaVersion,
                definition: options.definition,
                layout: options.layout,
                updatedById: options.ownerId,
              },
            },
          },
        },
      },
      select: studioAppSelect,
    })
  }

  update(
    appId: string,
    input: {
      title?: string
      description?: string | null
      icon?: string
    },
  ) {
    return this.prisma.app.update({
      where: { id: appId },
      data: {
        ...(input.title !== undefined ? { name: input.title } : {}),
        ...(input.description !== undefined ? { description: input.description } : {}),
        ...(input.icon !== undefined ? { icon: input.icon } : {}),
      },
      select: studioAppSelect,
    })
  }

  async deleteOwnedAppGraph(ownerId: string, appId: string): Promise<boolean> {
    return this.prisma.$transaction(
      async (transaction) => {
        const app = await transaction.app.findFirst({
          where: {
            id: appId,
            ownerId,
            deletedAt: null,
          },
          select: {
            workflow: {
              select: {
                id: true,
              },
            },
          },
        })

        if (!app) return false

        await transaction.apiCallLog.deleteMany({
          where: {
            appId,
          },
        })
        await transaction.apiKey.deleteMany({
          where: {
            appId,
          },
        })

        const workflowId = app.workflow?.id

        if (workflowId) {
          await transaction.workflowNodeRun.deleteMany({
            where: {
              run: {
                workflowId,
              },
            },
          })
          await transaction.workflowRun.deleteMany({
            where: {
              workflowId,
            },
          })
          await transaction.workflowDeployment.deleteMany({
            where: {
              workflowId,
            },
          })
          await transaction.workflowVersion.deleteMany({
            where: {
              workflowId,
            },
          })
          await transaction.workflowDraft.deleteMany({
            where: {
              workflowId,
            },
          })
          await transaction.workflow.delete({
            where: {
              id: workflowId,
            },
          })
        }

        const deletedApp = await transaction.app.deleteMany({
          where: {
            id: appId,
            ownerId,
          },
        })

        return deletedApp.count === 1
      },
      {
        timeout: 30_000,
      },
    )
  }

  private createCursorFilter(sort: StudioAppSort, cursor?: StudioAppCursor): Prisma.AppWhereInput {
    if (!cursor) return {}

    if (sort === 'updated_desc') {
      return {
        OR: [
          { updatedAt: { lt: cursor.value } },
          { updatedAt: cursor.value, id: { lt: cursor.id } },
        ],
      }
    }

    if (sort === 'created_desc') {
      return {
        OR: [
          { createdAt: { lt: cursor.value } },
          { createdAt: cursor.value, id: { lt: cursor.id } },
        ],
      }
    }

    return {
      OR: [{ createdAt: { gt: cursor.value } }, { createdAt: cursor.value, id: { gt: cursor.id } }],
    }
  }
}
