import type { PluginListScope, PluginListSort, PluginVisibilityValue } from '@/dto/plugin.dto'
import { PluginStatus, PluginVisibility, Prisma } from '@/generated/prisma/client'
import { PrismaService } from '@/infra/prisma/prisma.service'
import type { PluginPermission } from '@ai-workflow/plugin'
import { Injectable } from '@nestjs/common'
import { gt } from 'semver'

interface PublishPluginVersionOptions {
  ownerId: string
  packageName: string
  version: string
  visibility: PluginVisibilityValue
  manifest: Prisma.InputJsonValue
  artifactDigest: string
  archiveDigest: string
  changelog?: string
  storageKey: string
  byteSize: number
  name: string
  description: string
  icon?: string
}

interface SavePluginInstallationOptions {
  ownerId: string
  pluginId: string
  versionId: string
  permissions: PluginPermission[]
}

export interface PluginListCursor {
  id: string
  value: Date | string
}

interface ListPluginsOptions {
  ownerId: string
  limit: number
  search?: string
  scope: PluginListScope
  sort: PluginListSort
  cursor?: PluginListCursor
}

export interface PluginUsageSummary {
  workflowCount: number
  draftWorkflowCount: number
  versionWorkflowCount: number
}

export type RemovePluginInstallationResult =
  { status: 'not-found' } | { status: 'in-use'; usage: PluginUsageSummary } | { status: 'removed' }

const pluginBaseSelect = {
  id: true,
  packageName: true,
  name: true,
  description: true,
  icon: true,
  visibility: true,
  verified: true,
  createdAt: true,
  updatedAt: true,
  publisher: { select: { id: true, username: true } },
  latestVersion: {
    select: {
      id: true,
      version: true,
      publishedAt: true,
      manifest: true,
    },
  },
  _count: { select: { installations: true } },
} satisfies Prisma.PluginSelect

export type PublishPluginVersionResult =
  | { status: 'package-owned-by-other-user' }
  | { status: 'version-conflict' }
  | { status: 'version-not-newer'; latestVersion: string }
  | {
      status: 'published'
      version: {
        id: string
        pluginId: string
        packageName: string
        author: string
        version: string
        visibility: PluginVisibilityValue
        archiveDigest: string
        artifactDigest: string
        publishedAt: Date
      }
    }

@Injectable()
export class PluginRepository {
  constructor(private readonly prisma: PrismaService) {}

  listEnabledInstallations(ownerId: string) {
    return this.prisma.pluginInstallation.findMany({
      where: { ownerId, enabled: true },
      select: {
        pluginId: true,
        grantedPermissions: true,
        version: {
          select: {
            id: true,
            version: true,
            manifest: true,
            artifactReference: true,
            artifactDigest: true,
            artifactSize: true,
          },
        },
      },
      orderBy: { pluginId: 'asc' },
    })
  }

  findInstalledVersions(
    ownerId: string,
    versions: readonly { pluginId: string; version: string }[],
  ) {
    if (versions.length === 0) return Promise.resolve([])

    return this.prisma.pluginVersion.findMany({
      where: {
        OR: versions.map(({ pluginId, version }) => ({ pluginId, version })),
        plugin: { installations: { some: { ownerId, enabled: true } } },
      },
      select: {
        id: true,
        pluginId: true,
        version: true,
        manifest: true,
        artifactReference: true,
        artifactDigest: true,
        artifactSize: true,
        plugin: {
          select: {
            installations: {
              where: { ownerId, enabled: true },
              take: 1,
              select: { grantedPermissions: true },
            },
          },
        },
      },
    })
  }

  findAccessibleVersion(ownerId: string, pluginId: string, versionId: string) {
    return this.prisma.pluginVersion.findFirst({
      where: {
        id: versionId,
        pluginId,
        plugin: {
          status: PluginStatus.PUBLISHED,
          OR: [
            { visibility: PluginVisibility.PUBLIC },
            { visibility: PluginVisibility.PRIVATE, publisherId: ownerId },
            { installations: { some: { ownerId } } },
          ],
        },
      },
      select: {
        id: true,
        artifactReference: true,
      },
    })
  }

  findInstallableVersion(ownerId: string, pluginId: string, versionId: string) {
    return this.prisma.pluginVersion.findFirst({
      where: {
        id: versionId,
        pluginId,
        plugin: {
          status: PluginStatus.PUBLISHED,
          AND: [this.createAccessFilter(ownerId)],
        },
      },
      select: {
        id: true,
        manifest: true,
        plugin: {
          select: {
            latestVersionId: true,
            installations: {
              where: { ownerId },
              take: 1,
              select: { versionId: true },
            },
          },
        },
      },
    })
  }

  list(options: ListPluginsOptions) {
    const direction = options.sort === 'name_asc' ? 'asc' : 'desc',
      sortField =
        options.sort === 'name_asc'
          ? 'name'
          : options.sort === 'created_desc'
            ? 'createdAt'
            : 'updatedAt'

    return this.prisma.plugin.findMany({
      where: {
        status: PluginStatus.PUBLISHED,
        latestVersionId: { not: null },
        AND: [
          this.createAccessFilter(options.ownerId),
          this.createScopeFilter(options.ownerId, options.scope),
          ...(options.search
            ? [
                {
                  OR: [
                    {
                      name: {
                        contains: options.search,
                        mode: 'insensitive' as const,
                      },
                    },
                    {
                      description: {
                        contains: options.search,
                        mode: 'insensitive' as const,
                      },
                    },
                    {
                      packageName: {
                        contains: options.search,
                        mode: 'insensitive' as const,
                      },
                    },
                    {
                      publisher: {
                        is: {
                          username: {
                            contains: options.search,
                            mode: 'insensitive' as const,
                          },
                        },
                      },
                    },
                  ],
                },
              ]
            : []),
          this.createCursorFilter(options.sort, options.cursor),
        ],
      },
      orderBy: [{ [sortField]: direction }, { id: direction }],
      take: options.limit + 1,
      select: {
        ...pluginBaseSelect,
        installations: {
          where: { ownerId: options.ownerId },
          take: 1,
          select: {
            versionId: true,
            enabled: true,
            grantedPermissions: true,
            version: { select: { version: true } },
          },
        },
      },
    })
  }

  findById(ownerId: string, pluginId: string) {
    return this.prisma.plugin.findFirst({
      where: {
        id: pluginId,
        status: PluginStatus.PUBLISHED,
        latestVersionId: { not: null },
        AND: [this.createAccessFilter(ownerId)],
      },
      select: {
        ...pluginBaseSelect,
        latestVersion: {
          select: {
            id: true,
            version: true,
            publishedAt: true,
            manifest: true,
            readme: true,
          },
        },
        versions: {
          select: {
            id: true,
            version: true,
            publishedAt: true,
            authorName: true,
            changelog: true,
            manifest: true,
          },
        },
        installations: {
          where: { ownerId },
          take: 1,
          select: {
            versionId: true,
            enabled: true,
            grantedPermissions: true,
            version: { select: { version: true } },
          },
        },
      },
    })
  }

  saveInstallation(options: SavePluginInstallationOptions) {
    return this.prisma.pluginInstallation.upsert({
      where: {
        ownerId_pluginId: {
          ownerId: options.ownerId,
          pluginId: options.pluginId,
        },
      },
      create: {
        ownerId: options.ownerId,
        pluginId: options.pluginId,
        versionId: options.versionId,
        enabled: true,
        grantedPermissions: options.permissions,
      },
      update: {
        versionId: options.versionId,
        enabled: true,
        grantedPermissions: options.permissions,
      },
      select: {
        versionId: true,
        enabled: true,
        grantedPermissions: true,
        version: { select: { version: true } },
      },
    })
  }

  async updateInstallationEnabled(ownerId: string, pluginId: string, enabled: boolean) {
    return this.prisma.$transaction(async (transaction) => {
      const result = await transaction.pluginInstallation.updateMany({
        where: { ownerId, pluginId },
        data: { enabled },
      })
      if (result.count === 0) return null

      return transaction.pluginInstallation.findUnique({
        where: { ownerId_pluginId: { ownerId, pluginId } },
        select: {
          versionId: true,
          enabled: true,
          grantedPermissions: true,
          version: { select: { version: true } },
          plugin: { select: { latestVersionId: true } },
        },
      })
    })
  }

  getUsageSummary(ownerId: string, pluginId: string): Promise<PluginUsageSummary> {
    return this.readUsageSummary(this.prisma, ownerId, pluginId)
  }

  async removeInstallationIfUnused(
    ownerId: string,
    pluginId: string,
  ): Promise<RemovePluginInstallationResult> {
    return this.prisma.$transaction(async (transaction) => {
      const installation = await transaction.pluginInstallation.findUnique({
        where: { ownerId_pluginId: { ownerId, pluginId } },
        select: { id: true },
      })
      if (!installation) return { status: 'not-found' }

      const usage = await this.readUsageSummary(transaction, ownerId, pluginId)
      if (usage.workflowCount > 0) return { status: 'in-use', usage }

      await transaction.pluginInstallation.delete({ where: { id: installation.id } })
      return { status: 'removed' }
    })
  }

  private async readUsageSummary(
    client: Prisma.TransactionClient | PrismaService,
    ownerId: string,
    pluginId: string,
  ): Promise<PluginUsageSummary> {
    const [draftDependencies, versionDependencies] = await Promise.all([
        client.workflowDraftPluginDependency.findMany({
          where: {
            pluginVersion: { pluginId },
            workflowDraft: { workflow: { app: { ownerId, deletedAt: null } } },
          },
          select: { workflowDraft: { select: { workflowId: true } } },
        }),
        client.workflowVersionPluginDependency.findMany({
          where: {
            pluginVersion: { pluginId },
            workflowVersion: { workflow: { app: { ownerId, deletedAt: null } } },
          },
          select: { workflowVersion: { select: { workflowId: true } } },
        }),
      ]),
      draftWorkflowIds = new Set(
        draftDependencies.map((dependency) => dependency.workflowDraft.workflowId),
      ),
      versionWorkflowIds = new Set(
        versionDependencies.map((dependency) => dependency.workflowVersion.workflowId),
      )

    return {
      workflowCount: new Set([...draftWorkflowIds, ...versionWorkflowIds]).size,
      draftWorkflowCount: draftWorkflowIds.size,
      versionWorkflowCount: versionWorkflowIds.size,
    }
  }

  async publishVersion(options: PublishPluginVersionOptions): Promise<PublishPluginVersionResult> {
    try {
      return await this.prisma.$transaction(async (transaction) => {
        const author = await transaction.user.findUniqueOrThrow({
            where: { id: options.ownerId },
            select: { username: true },
          }),
          identity = await transaction.plugin.upsert({
            where: { packageName: options.packageName },
            create: {
              publisherId: options.ownerId,
              packageName: options.packageName,
              name: options.name,
              description: options.description,
              icon: options.icon,
              category: 'other',
              visibility: options.visibility as PluginVisibility,
              status: PluginStatus.PUBLISHED,
            },
            update: {},
            select: { id: true },
          })

        await transaction.$queryRaw(
          Prisma.sql`SELECT "id" FROM "plugins" WHERE "id" = ${identity.id}::uuid FOR UPDATE`,
        )
        const plugin = await transaction.plugin.findUniqueOrThrow({
          where: { id: identity.id },
          select: {
            id: true,
            publisherId: true,
            latestVersion: { select: { version: true } },
          },
        })

        if (plugin.publisherId !== options.ownerId) {
          return { status: 'package-owned-by-other-user' }
        }
        if (plugin.latestVersion && !gt(options.version, plugin.latestVersion.version)) {
          return {
            status: 'version-not-newer',
            latestVersion: plugin.latestVersion.version,
          }
        }

        const version = await transaction.pluginVersion.create({
          data: {
            pluginId: plugin.id,
            version: options.version,
            platformApiVersion: '1',
            manifest: options.manifest,
            readme: '',
            artifactDigest: options.artifactDigest,
            artifactReference: options.storageKey,
            artifactSize: options.byteSize,
            changelog: options.changelog ?? '',
            authorName: author.username,
          },
          select: {
            id: true,
            version: true,
            artifactDigest: true,
            publishedAt: true,
          },
        })

        await transaction.plugin.update({
          where: { id: plugin.id },
          data: {
            latestVersionId: version.id,
            name: options.name,
            description: options.description,
            icon: options.icon,
            visibility: options.visibility as PluginVisibility,
            status: PluginStatus.PUBLISHED,
          },
        })

        return {
          status: 'published',
          version: {
            id: version.id,
            pluginId: plugin.id,
            packageName: options.packageName,
            author: author.username,
            version: version.version,
            visibility: options.visibility,
            archiveDigest: options.archiveDigest,
            artifactDigest: version.artifactDigest,
            publishedAt: version.publishedAt,
          },
        }
      })
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        return { status: 'version-conflict' }
      }
      throw error
    }
  }

  private createAccessFilter(ownerId: string): Prisma.PluginWhereInput {
    return {
      OR: [
        { visibility: PluginVisibility.PUBLIC },
        { visibility: PluginVisibility.PRIVATE, publisherId: ownerId },
      ],
    }
  }

  private createScopeFilter(ownerId: string, scope: PluginListScope): Prisma.PluginWhereInput {
    if (scope === 'INSTALLED') return { installations: { some: { ownerId } } }
    if (scope === 'MINE') return { publisherId: ownerId }
    if (scope === 'USED') {
      return {
        versions: {
          some: {
            OR: [
              {
                workflowDependencies: {
                  some: {
                    workflowVersion: { workflow: { app: { ownerId } } },
                  },
                },
              },
              {
                workflowDraftDependencies: {
                  some: {
                    workflowDraft: { workflow: { app: { ownerId } } },
                  },
                },
              },
            ],
          },
        },
      }
    }
    return {}
  }

  private createCursorFilter(
    sort: PluginListSort,
    cursor?: PluginListCursor,
  ): Prisma.PluginWhereInput {
    if (!cursor) return {}

    if (sort === 'name_asc') {
      const value = cursor.value as string
      return {
        OR: [{ name: { gt: value } }, { name: value, id: { gt: cursor.id } }],
      }
    }

    const field = sort === 'created_desc' ? 'createdAt' : 'updatedAt',
      value = cursor.value as Date
    return {
      OR: [{ [field]: { lt: value } }, { [field]: value, id: { lt: cursor.id } }],
    }
  }
}
