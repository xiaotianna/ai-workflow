import type { PluginListScope, PluginListSort, PluginVisibilityValue } from '@/dto/plugin.dto'
import { PluginStatus, PluginVisibility, Prisma } from '@/generated/prisma/client'
import { PrismaService } from '@/infra/prisma/prisma.service'
import { Injectable } from '@nestjs/common'

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

const pluginListSelect = {
  id: true,
  packageName: true,
  name: true,
  description: true,
  visibility: true,
  verified: true,
  createdAt: true,
  updatedAt: true,
  publisher: { select: { id: true, username: true } },
  versions: {
    orderBy: [{ publishedAt: 'desc' as const }, { id: 'desc' as const }],
    take: 1,
    select: { version: true, publishedAt: true },
  },
  _count: { select: { installations: true } },
} satisfies Prisma.PluginSelect

const pluginDetailSelect = {
  ...pluginListSelect,
  versions: {
    orderBy: [{ publishedAt: 'desc' as const }, { id: 'desc' as const }],
    select: {
      version: true,
      publishedAt: true,
      authorName: true,
      changelog: true,
      readme: true,
    },
  },
} satisfies Prisma.PluginSelect

export type PublishPluginVersionResult =
  | { status: 'package-owned-by-other-user' }
  | { status: 'version-conflict' }
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

  list(options: ListPluginsOptions) {
    const direction = options.sort === 'name_asc' ? 'asc' : 'desc'
    const sortField =
      options.sort === 'name_asc'
        ? 'name'
        : options.sort === 'created_desc'
          ? 'createdAt'
          : 'updatedAt'

    return this.prisma.plugin.findMany({
      where: {
        status: PluginStatus.PUBLISHED,
        versions: { some: {} },
        AND: [
          this.createAccessFilter(options.ownerId),
          this.createScopeFilter(options.ownerId, options.scope),
          ...(options.search
            ? [
                {
                  OR: [
                    { name: { contains: options.search, mode: 'insensitive' as const } },
                    { description: { contains: options.search, mode: 'insensitive' as const } },
                    { packageName: { contains: options.search, mode: 'insensitive' as const } },
                    {
                      publisher: {
                        is: {
                          username: { contains: options.search, mode: 'insensitive' as const },
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
      select: pluginListSelect,
    })
  }

  findById(ownerId: string, pluginId: string) {
    return this.prisma.plugin.findFirst({
      where: {
        id: pluginId,
        status: PluginStatus.PUBLISHED,
        versions: { some: {} },
        AND: [this.createAccessFilter(ownerId)],
      },
      select: pluginDetailSelect,
    })
  }

  async publishVersion(options: PublishPluginVersionOptions): Promise<PublishPluginVersionResult> {
    try {
      return await this.prisma.$transaction(async (transaction) => {
        const author = await transaction.user.findUniqueOrThrow({
          where: { id: options.ownerId },
          select: { username: true },
        })
        const plugin = await transaction.plugin.upsert({
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
          select: { id: true, publisherId: true },
        })

        if (plugin.publisherId !== options.ownerId) {
          return { status: 'package-owned-by-other-user' }
        }

        await transaction.plugin.update({
          where: { id: plugin.id },
          data: {
            name: options.name,
            description: options.description,
            icon: options.icon,
            visibility: options.visibility as PluginVisibility,
            status: PluginStatus.PUBLISHED,
          },
        })

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
          select: { id: true, version: true, artifactDigest: true, publishedAt: true },
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
            workflowDependencies: {
              some: {
                workflowVersion: { workflow: { app: { ownerId } } },
              },
            },
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
      return { OR: [{ name: { gt: value } }, { name: value, id: { gt: cursor.id } }] }
    }

    const field = sort === 'created_desc' ? 'createdAt' : 'updatedAt'
    const value = cursor.value as Date
    return { OR: [{ [field]: { lt: value } }, { [field]: value, id: { lt: cursor.id } }] }
  }
}
