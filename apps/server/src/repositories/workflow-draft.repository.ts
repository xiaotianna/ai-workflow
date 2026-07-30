import { Prisma } from '@/generated/prisma/client'
import { PrismaService } from '@/infra/prisma/prisma.service'
import { Injectable } from '@nestjs/common'

interface SaveWorkflowDraftOptions {
  ownerId: string
  appId: string
  workflowId: string
  revision: number
  definition: Prisma.InputJsonValue
  layout: Prisma.InputJsonValue
}

type SaveWorkflowDraftResult =
  | { status: 'not-found' }
  | { status: 'conflict' }
  | { status: 'workflow-mismatch' }
  | {
      status: 'saved'
      draft: {
        schemaVersion: number
        revision: number
        definition: Prisma.JsonValue
        layout: Prisma.JsonValue
        updatedAt: Date
      }
    }

@Injectable()
export class WorkflowDraftRepository {
  constructor(private readonly prisma: PrismaService) {}

  findOwned(ownerId: string, appId: string) {
    return this.prisma.app.findFirst({
      where: {
        id: appId,
        ownerId,
        deletedAt: null,
      },
      select: {
        workflow: {
          select: {
            id: true,
            draft: {
              select: {
                schemaVersion: true,
                revision: true,
                definition: true,
                layout: true,
                updatedAt: true,
              },
            },
          },
        },
      },
    })
  }

  saveOwned(options: SaveWorkflowDraftOptions): Promise<SaveWorkflowDraftResult> {
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
                select: {
                  id: true,
                  revision: true,
                },
              },
            },
          },
        },
      })
      const workflow = app?.workflow
      const draft = workflow?.draft

      if (!workflow || !draft) return { status: 'not-found' }
      if (workflow.id !== options.workflowId) return { status: 'workflow-mismatch' }
      if (draft.revision !== options.revision) return { status: 'conflict' }

      const updated = await transaction.workflowDraft.updateMany({
        where: {
          id: draft.id,
          revision: options.revision,
        },
        data: {
          definition: options.definition,
          layout: options.layout,
          revision: {
            increment: 1,
          },
          updatedById: options.ownerId,
        },
      })

      if (updated.count !== 1) return { status: 'conflict' }

      await transaction.app.update({
        where: {
          id: options.appId,
        },
        data: {
          updatedAt: new Date(),
        },
      })

      const updatedDraft = await transaction.workflowDraft.findUniqueOrThrow({
        where: {
          id: draft.id,
        },
        select: {
          schemaVersion: true,
          revision: true,
          definition: true,
          layout: true,
          updatedAt: true,
        },
      })

      return {
        status: 'saved',
        draft: updatedDraft,
      }
    })
  }
}
