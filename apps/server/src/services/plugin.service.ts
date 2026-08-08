import type {
  InstallPluginDto,
  ListPluginsDto,
  PluginListSort,
  PublishPluginDto,
} from '@/dto/plugin.dto'
import type { Prisma } from '@/generated/prisma/client'
import { PluginArtifactStore } from '@/infra/plugin-artifact/plugin-artifact-store'
import { PluginPackageInspector } from '@/infra/plugin-artifact/plugin-package-inspector'
import { PluginRepository, type PluginListCursor } from '@/repositories/plugin.repository'
import type {
  PluginDetailVo,
  PluginListItemVo,
  PluginListVo,
  InstalledPluginVo,
  PublishedPluginVersionVo,
} from '@/vo/plugin.vo'
import {
  PLUGIN_PERMISSION_VALUES,
  pluginManifestSchema,
  type PluginPermission,
} from '@ai-workflow/plugin'
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import { isUUID } from 'class-validator'
import { rcompare } from 'semver'

export interface UploadedPluginPackage {
  originalname: string
  buffer: Buffer
}

@Injectable()
export class PluginService {
  constructor(
    private readonly packageInspector: PluginPackageInspector,
    private readonly artifactStore: PluginArtifactStore,
    private readonly pluginRepository: PluginRepository,
  ) {}

  async list(ownerId: string, query: ListPluginsDto): Promise<PluginListVo> {
    const cursor = query.cursor ? this.decodeCursor(query.cursor, query.sort) : undefined
    const plugins = await this.pluginRepository.list({
      ownerId,
      limit: query.limit,
      search: query.search || undefined,
      scope: query.scope,
      sort: query.sort,
      cursor,
    })
    const hasMore = plugins.length > query.limit
    const page = hasMore ? plugins.slice(0, query.limit) : plugins
    const lastPlugin = page.at(-1)

    return {
      items: page.map((plugin) => this.toListItemVo(plugin)),
      nextCursor:
        hasMore && lastPlugin
          ? this.encodeCursor({
              id: lastPlugin.id,
              value:
                query.sort === 'name_asc'
                  ? lastPlugin.name
                  : query.sort === 'created_desc'
                    ? lastPlugin.createdAt
                    : lastPlugin.updatedAt,
            })
          : null,
    }
  }

  async get(ownerId: string, pluginId: string): Promise<PluginDetailVo> {
    const plugin = await this.pluginRepository.findById(ownerId, pluginId)
    if (!plugin) throw new NotFoundException('未找到该插件')

    const listItem = this.toListItemVo(plugin)
    const latestVersion = plugin.latestVersion
    if (!latestVersion) throw new NotFoundException('未找到该插件版本')
    const versions = [...plugin.versions].sort((left, right) =>
      rcompare(left.version, right.version),
    )

    return {
      ...listItem,
      content: latestVersion.readme || plugin.description,
      versions: versions.map((version) => ({
        id: version.id,
        version: version.version,
        publishedAt: version.publishedAt,
        author: version.authorName,
        changelog: version.changelog,
        permissions: this.readManifestPermissions(version.manifest),
      })),
    }
  }

  async install(
    ownerId: string,
    pluginId: string,
    dto: InstallPluginDto,
  ): Promise<InstalledPluginVo> {
    const plugin = await this.pluginRepository.findById(ownerId, pluginId)
    if (!plugin?.latestVersion) throw new NotFoundException('未找到该插件')
    if (plugin.latestVersion.id !== dto.versionId) {
      throw new ConflictException('插件版本已更新，请刷新后重试')
    }

    const requiredPermissions = this.readManifestPermissions(plugin.latestVersion.manifest)
    if (!hasSamePermissions(requiredPermissions, dto.permissions)) {
      throw new BadRequestException('授权权限与插件版本要求不一致')
    }

    const installation = await this.pluginRepository.saveInstallation({
      ownerId,
      pluginId,
      versionId: plugin.latestVersion.id,
      permissions: requiredPermissions,
    })

    return {
      pluginId,
      installation: {
        versionId: installation.versionId,
        version: installation.version.version,
        enabled: installation.enabled,
        grantedPermissions: this.readGrantedPermissions(installation.grantedPermissions),
      },
      updateAvailable: false,
    }
  }

  async publish(
    ownerId: string,
    file: UploadedPluginPackage | undefined,
    dto: PublishPluginDto,
  ): Promise<PublishedPluginVersionVo> {
    if (!file) throw new BadRequestException('请选择插件包')
    if (!/\.tgz$/i.test(file.originalname)) {
      throw new BadRequestException('仅支持 .tgz 格式的插件包')
    }

    const inspectedPackage = this.packageInspector.inspect(file.buffer)
    const { packageName, displayName, description, version } = inspectedPackage.manifest.plugin
    const firstNode = inspectedPackage.manifest.nodes[0]
    const originalFileName = file.originalname.replaceAll('\\', '/').split('/').at(-1) ?? ''
    if (!originalFileName || originalFileName.length > 255) {
      throw new BadRequestException('插件包文件名不合法')
    }
    const storedArchive = await this.artifactStore.storeArchive({
      packageName,
      version,
      content: file.buffer,
    })
    let published = false

    try {
      const result = await this.pluginRepository.publishVersion({
        ownerId,
        packageName,
        version,
        visibility: dto.visibility,
        manifest: structuredClone(inspectedPackage.manifest) as unknown as Prisma.InputJsonValue,
        artifactDigest: inspectedPackage.artifactDigest,
        archiveDigest: inspectedPackage.archiveDigest,
        changelog: dto.changelog || undefined,
        storageKey: storedArchive.storageKey,
        byteSize: file.buffer.byteLength,
        name: displayName,
        description: description ?? firstNode?.description ?? `${packageName} 插件`,
        icon: firstNode?.icon,
      })

      if (result.status === 'package-owned-by-other-user') {
        throw new ForbiddenException(`Package ${packageName} 已归属其他用户`)
      }
      if (result.status === 'version-conflict') {
        throw new ConflictException(`插件 ${packageName} 的 ${version} 版本已发布`)
      }
      if (result.status === 'version-not-newer') {
        throw new ConflictException(
          `插件 ${packageName} 的新版本必须高于当前版本 ${result.latestVersion}`,
        )
      }

      published = true
      return result.version
    } finally {
      if (!published) await this.artifactStore.remove(storedArchive.storageKey)
    }
  }

  private toListItemVo(plugin: {
    id: string
    packageName: string
    name: string
    description: string
    visibility: 'PUBLIC' | 'PRIVATE'
    verified: boolean
    createdAt: Date
    updatedAt: Date
    latestVersion: {
      id: string
      version: string
      publishedAt: Date
      manifest: unknown
    } | null
    _count: { installations: number }
    publisher: { id: string; username: string } | null
    installations: Array<{
      versionId: string
      enabled: boolean
      grantedPermissions: string[]
      version: { version: string }
    }>
  }): PluginListItemVo {
    const latestVersion = plugin.latestVersion
    if (!latestVersion) {
      throw new Error(`已发布插件 ${plugin.packageName} 缺少版本`)
    }
    if (!plugin.publisher) throw new Error(`已发布插件 ${plugin.packageName} 缺少上传作者`)
    const currentInstallation = plugin.installations[0]
    const installation = currentInstallation
      ? {
          versionId: currentInstallation.versionId,
          version: currentInstallation.version.version,
          enabled: currentInstallation.enabled,
          grantedPermissions: this.readGrantedPermissions(currentInstallation.grantedPermissions),
        }
      : null

    return {
      id: plugin.id,
      packageName: plugin.packageName,
      name: plugin.name,
      description: plugin.description,
      author: plugin.publisher,
      verified: plugin.verified,
      visibility: plugin.visibility,
      installCount: plugin._count.installations,
      latestVersion: {
        id: latestVersion.id,
        version: latestVersion.version,
        publishedAt: latestVersion.publishedAt,
        permissions: this.readManifestPermissions(latestVersion.manifest),
      },
      installation,
      updateAvailable: installation !== null && installation.versionId !== latestVersion.id,
      createdAt: plugin.createdAt,
      updatedAt: plugin.updatedAt,
    }
  }

  private readManifestPermissions(manifest: unknown): PluginPermission[] {
    const result = pluginManifestSchema.safeParse(manifest)
    if (!result.success) throw new Error('插件版本 Manifest 数据无效')
    return [...result.data.permissions]
  }

  private readGrantedPermissions(permissions: string[]): PluginPermission[] {
    return PLUGIN_PERMISSION_VALUES.filter((permission) => permissions.includes(permission))
  }

  private encodeCursor(cursor: PluginListCursor): string {
    return Buffer.from(
      JSON.stringify({
        id: cursor.id,
        value: cursor.value instanceof Date ? cursor.value.toISOString() : cursor.value,
      }),
    ).toString('base64url')
  }

  private decodeCursor(cursor: string, sort: PluginListSort): PluginListCursor {
    try {
      const parsed = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8')) as {
        id?: unknown
        value?: unknown
      }

      if (typeof parsed.id !== 'string' || !isUUID(parsed.id, '4')) {
        throw new Error('Invalid cursor')
      }

      if (sort === 'name_asc') {
        if (typeof parsed.value !== 'string' || !parsed.value) throw new Error('Invalid cursor')
        return { id: parsed.id, value: parsed.value }
      }

      const value = typeof parsed.value === 'string' ? new Date(parsed.value) : undefined
      if (!value || Number.isNaN(value.getTime())) throw new Error('Invalid cursor')

      return { id: parsed.id, value }
    } catch {
      throw new BadRequestException('分页游标无效')
    }
  }
}

function hasSamePermissions(
  requiredPermissions: readonly PluginPermission[],
  grantedPermissions: readonly PluginPermission[],
): boolean {
  if (requiredPermissions.length !== grantedPermissions.length) return false
  const granted = new Set(grantedPermissions)
  return requiredPermissions.every((permission) => granted.has(permission))
}
