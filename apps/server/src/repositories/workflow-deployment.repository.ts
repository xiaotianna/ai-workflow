import type { WorkflowPluginDependencyInput } from '@/common/interfaces/workflow-plugin-dependency.interface'
import { Prisma, WorkflowVersionSource } from '@/generated/prisma/client'
import { PrismaService } from '@/infra/prisma/prisma.service'
import { Injectable } from '@nestjs/common'

interface PublishWorkflowOptions {
  ownerId: string
  appId: string
  workflowId: string
  schemaVersion: number
  definition: Prisma.InputJsonValue
  layout: Prisma.InputJsonValue
  pluginDependencies: readonly WorkflowPluginDependencyInput[]
}

type PublishWorkflowResult =
  | { status: 'not-found' }
  | { status: 'workflow-mismatch' }
  | {
      status: 'published'
      deployment: {
        versionId: string
        version: number
        publishedAt: Date
      }
    }

@Injectable()
export class WorkflowDeploymentRepository {
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
            deployments: {
              take: 1,
              select: {
                version: {
                  select: {
                    id: true,
                    version: true,
                    createdAt: true,
                  },
                },
              },
            },
          },
        },
      },
    })
  }

  findOwnedPublishedContract(ownerId: string, appId: string) {
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
            deployments: {
              take: 1,
              select: {
                version: {
                  select: {
                    id: true,
                    version: true,
                    createdAt: true,
                    definition: true,
                  },
                },
              },
            },
          },
        },
      },
    })
  }

  publishOwned(options: PublishWorkflowOptions): Promise<PublishWorkflowResult> {
    return this.prisma.$transaction(async (transaction) => {
      const app = await transaction.app.findFirst({
        where: {
          id: options.appId,
          ownerId: options.ownerId,
          deletedAt: null,
        },
        select: {
          workflow: {
            select: { id: true },
          },
        },
      })

      if (!app?.workflow) return { status: 'not-found' }
      if (app.workflow.id !== options.workflowId) return { status: 'workflow-mismatch' }

      await transaction.$queryRaw(
        Prisma.sql`SELECT "id" FROM "workflows" WHERE "id" = ${options.workflowId}::uuid FOR UPDATE`,
      )

      const latestVersion = await transaction.workflowVersion.aggregate({
        where: { workflowId: options.workflowId },
        _max: { version: true },
      })
      const version = await transaction.workflowVersion.create({
        data: {
          workflowId: options.workflowId,
          version: (latestVersion._max.version ?? 0) + 1,
          source: WorkflowVersionSource.PUBLISH,
          schemaVersion: options.schemaVersion,
          definition: options.definition,
          layout: options.layout,
          note: null,
          createdById: options.ownerId,
          pluginDependencies: {
            create: options.pluginDependencies.map((dependency) => ({
              pluginVersionId: dependency.pluginVersionId,
              manifest: toJsonInput(dependency.manifest),
              artifactReference: dependency.artifactReference,
              artifactDigest: dependency.artifactDigest,
              artifactSize: dependency.artifactSize,
            })),
          },
        },
        select: {
          id: true,
          version: true,
          createdAt: true,
        },
      })

      await transaction.workflowDeployment.upsert({
        where: { workflowId: options.workflowId },
        create: {
          workflowId: options.workflowId,
          versionId: version.id,
          deployedById: options.ownerId,
        },
        update: {
          versionId: version.id,
          deployedById: options.ownerId,
        },
      })

      return {
        status: 'published',
        deployment: {
          versionId: version.id,
          version: version.version,
          publishedAt: version.createdAt,
        },
      }
    })
  }
}

function toJsonInput(value: unknown): Prisma.InputJsonValue {
  return structuredClone(value) as Prisma.InputJsonValue
}
