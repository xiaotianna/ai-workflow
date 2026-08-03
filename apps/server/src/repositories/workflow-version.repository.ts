import { Prisma, WorkflowVersionSource } from '@/generated/prisma/client'
import { PrismaService } from '@/infra/prisma/prisma.service'
import { Injectable } from '@nestjs/common'

interface RenameWorkflowVersionOptions {
  ownerId: string
  appId: string
  versionId: string
  name: string
}

interface WorkflowVersionOwnerOptions {
  ownerId: string
  appId: string
  versionId: string
}

type RestoreWorkflowVersionResult =
  | { status: 'not-found' }
  | {
      status: 'restored'
      draft: {
        schemaVersion: number
        revision: number
        definition: Prisma.JsonValue
        layout: Prisma.JsonValue
        updatedAt: Date
      }
    }

type RenameWorkflowVersionResult =
  | { status: 'not-found' }
  | {
      status: 'renamed'
      version: {
        id: string
        version: number
        note: string | null
        createdAt: Date
        createdBy: {
          id: string
          username: string
        } | null
      }
    }

type DeleteWorkflowVersionResult =
  | { status: 'not-found' }
  | { status: 'in-use' }
  | { status: 'deleted' }

@Injectable()
export class WorkflowVersionRepository {
  constructor(private readonly prisma: PrismaService) {}

  listOwned(ownerId: string, appId: string) {
    return this.prisma.app.findFirst({
      where: {
        id: appId,
        ownerId,
        deletedAt: null,
      },
      select: {
        workflow: {
          select: {
            versions: {
              where: { source: WorkflowVersionSource.PUBLISH },
              orderBy: [{ version: 'desc' }, { id: 'desc' }],
              select: {
                id: true,
                version: true,
                note: true,
                createdAt: true,
                createdBy: {
                  select: {
                    id: true,
                    username: true,
                  },
                },
              },
            },
          },
        },
      },
    })
  }

  restoreOwned(options: WorkflowVersionOwnerOptions): Promise<RestoreWorkflowVersionResult> {
    return this.prisma.$transaction(async (transaction) => {
      const app = await transaction.app.findFirst({
        where: {
          id: options.appId,
          ownerId: options.ownerId,
          deletedAt: null,
        },
        select: {
          workflow: {
            select: {
              id: true,
              draft: {
                select: { id: true },
              },
            },
          },
        },
      })
      const workflow = app?.workflow
      const draft = workflow?.draft
      if (!workflow || !draft) return { status: 'not-found' }

      const version = await transaction.workflowVersion.findFirst({
        where: {
          id: options.versionId,
          workflowId: workflow.id,
          source: WorkflowVersionSource.PUBLISH,
        },
        select: {
          schemaVersion: true,
          definition: true,
          layout: true,
        },
      })
      if (!version) return { status: 'not-found' }

      const restoredDraft = await transaction.workflowDraft.update({
        where: { id: draft.id },
        data: {
          schemaVersion: version.schemaVersion,
          definition: version.definition as Prisma.InputJsonValue,
          layout: version.layout as Prisma.InputJsonValue,
          revision: { increment: 1 },
          updatedById: options.ownerId,
        },
        select: {
          schemaVersion: true,
          revision: true,
          definition: true,
          layout: true,
          updatedAt: true,
        },
      })

      await transaction.app.update({
        where: { id: options.appId },
        data: { updatedAt: new Date() },
      })

      return {
        status: 'restored',
        draft: restoredDraft,
      }
    })
  }

  renameOwned(options: RenameWorkflowVersionOptions): Promise<RenameWorkflowVersionResult> {
    return this.prisma.$transaction(async (transaction) => {
      const version = await transaction.workflowVersion.findFirst({
        where: {
          id: options.versionId,
          source: WorkflowVersionSource.PUBLISH,
          workflow: {
            app: {
              id: options.appId,
              ownerId: options.ownerId,
              deletedAt: null,
            },
          },
        },
        select: { id: true },
      })
      if (!version) return { status: 'not-found' }

      const renamedVersion = await transaction.workflowVersion.update({
        where: { id: version.id },
        data: { note: options.name },
        select: {
          id: true,
          version: true,
          note: true,
          createdAt: true,
          createdBy: {
            select: {
              id: true,
              username: true,
            },
          },
        },
      })

      return {
        status: 'renamed',
        version: renamedVersion,
      }
    })
  }

  deleteOwned(options: WorkflowVersionOwnerOptions): Promise<DeleteWorkflowVersionResult> {
    return this.prisma.$transaction(async (transaction) => {
      const version = await transaction.workflowVersion.findFirst({
        where: {
          id: options.versionId,
          source: WorkflowVersionSource.PUBLISH,
          workflow: {
            app: {
              id: options.appId,
              ownerId: options.ownerId,
              deletedAt: null,
            },
          },
        },
        select: {
          id: true,
          _count: {
            select: {
              deployments: true,
              runs: true,
            },
          },
        },
      })
      if (!version) return { status: 'not-found' }
      if (version._count.deployments > 0 || version._count.runs > 0) {
        return { status: 'in-use' }
      }

      await transaction.workflowVersion.delete({
        where: { id: version.id },
      })

      return { status: 'deleted' }
    })
  }
}
