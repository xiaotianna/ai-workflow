import type {
  InstallPluginDto,
  ListPluginsDto,
  PluginListSort,
  PublishPluginDto,
  UpdatePluginInstallationDto,
} from '@/dto/plugin.dto'
import { PluginCatalogService } from '@/services/plugin-catalog.service'
import type { Prisma } from '@/generated/prisma/client'
import { PluginArtifactStore } from '@/infra/plugin-artifact/plugin-artifact-store'
import { PluginArtifactReader } from '@/infra/plugin-artifact/plugin-artifact-reader'
import { PluginPackageInspector } from '@/infra/plugin-artifact/plugin-package-inspector'
import { PluginRepository, type PluginListCursor } from '@/repositories/plugin.repository'
import type {
  PluginDetailVo,
  PluginListItemVo,
  PluginListVo,
  InstalledPluginVo,
  PublishedPluginVersionVo,
  PluginRuntimeCatalogVo,
  UninstalledPluginVo,
} from '@/vo/plugin.vo'
import {
  BUILTIN_WORKFLOW_NODE_CATALOG_VERSION,
  builtinNodeStrategies,
  createWorkflowNodeCatalog,
  type WorkflowPluginLock,
} from '@ai-workflow/core'
import {
  PLUGIN_PERMISSION_VALUES,
  createNodeTypesFromPluginManifest,
  pluginManifestSchema,
  type PluginManifest,
  type PluginPermission,
} from '@ai-workflow/plugin'
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  StreamableFile,
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
    private readonly artifactReader: PluginArtifactReader,
    private readonly pluginRepository: PluginRepository,
    private readonly pluginCatalogService: PluginCatalogService,
  ) {}

  async resolveRuntimeCatalog(
    ownerId: string,
    pluginLock: WorkflowPluginLock,
  ): Promise<PluginRuntimeCatalogVo> {
    const resolvedPlugins = await this.pluginCatalogService.resolveEditorVersions(
        ownerId,
        pluginLock,
      ),
      resolvedLock = resolvedPlugins.map((plugin) => ({
        pluginId: plugin.pluginId,
        version: plugin.version,
        digest: plugin.artifactDigest,
      })),
      catalog = createWorkflowNodeCatalog({
        hostVersion: BUILTIN_WORKFLOW_NODE_CATALOG_VERSION,
        nodes: [
          ...Object.values(builtinNodeStrategies),
          ...resolvedPlugins.flatMap((plugin) =>
            createNodeTypesFromPluginManifest(plugin.manifest),
          ),
        ],
        pluginLock: resolvedLock,
      })

    return {
      fingerprint: catalog.fingerprint,
      pluginLock: catalog.pluginLock,
      plugins: await Promise.all(
        resolvedPlugins.map(async (plugin) => ({
          pluginId: plugin.pluginId,
          versionId: plugin.versionId,
          version: plugin.version,
          artifactDigest: plugin.artifactDigest,
          manifest: await this.resolveManifestIcons(
            plugin.manifest,
            plugin.dependency.artifactReference,
          ),
        })),
      ),
    }
  }

  async getVersionAsset(
    ownerId: string,
    pluginId: string,
    versionId: string,
    assetPath: string,
  ): Promise<StreamableFile> {
    const version = await this.pluginRepository.findAccessibleVersion(ownerId, pluginId, versionId)
    if (!version?.artifactReference) throw new NotFoundException('未找到该插件版本')

    const asset = await this.artifactReader.readAsset(version.artifactReference, assetPath)
    return new StreamableFile(asset.content, {
      type: asset.contentType,
      disposition: 'inline',
    })
  }

  private async resolveManifestIcons(
    manifest: PluginManifest,
    artifactReference: string,
  ): Promise<PluginManifest> {
    const nodes = await Promise.all(
      manifest.nodes.map(async (node) => {
        if (!node.icon) return node

        const asset = await this.artifactReader.readAsset(artifactReference, node.icon)
        return {
          ...node,
          icon: `data:${asset.contentType};base64,${asset.content.toString('base64')}`,
        }
      }),
    )

    return { ...manifest, nodes }
  }

  async list(ownerId: string, query: ListPluginsDto): Promise<PluginListVo> {
    const cursor = query.cursor ? this.decodeCursor(query.cursor, query.sort) : undefined,
      plugins = await this.pluginRepository.list({
        ownerId,
        limit: query.limit,
        search: query.search || undefined,
        scope: query.scope,
        sort: query.sort,
        cursor,
      }),
      hasMore = plugins.length > query.limit,
      page = hasMore ? plugins.slice(0, query.limit) : plugins,
      lastPlugin = page.at(-1)

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

    const listItem = this.toListItemVo(plugin),
      latestVersion = plugin.latestVersion
    if (!latestVersion) throw new NotFoundException('未找到该插件版本')
    const versions = [...plugin.versions].sort((left, right) =>
        rcompare(left.version, right.version),
      ),
      usage = await this.pluginRepository.getUsageSummary(ownerId, pluginId)

    return {
      ...listItem,
      content: latestVersion.readme || plugin.description,
      usage,
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
    const version = await this.pluginRepository.findInstallableVersion(
      ownerId,
      pluginId,
      dto.versionId,
    )
    if (!version) throw new NotFoundException('未找到该插件版本')

    const requiredPermissions = this.readManifestPermissions(version.manifest)
    if (!hasSamePermissions(requiredPermissions, dto.permissions)) {
      throw new BadRequestException('授权权限与插件版本要求不一致')
    }
    const currentInstallation = version.plugin.installations[0],
      changingVersion =
        currentInstallation !== undefined && currentInstallation.versionId !== version.id
    if (changingVersion && dto.acknowledgeVersionChange !== true) {
      throw new BadRequestException('更改插件版本前必须确认对编辑中工作流的影响')
    }

    const installation = await this.pluginRepository.saveInstallation({
      ownerId,
      pluginId,
      versionId: version.id,
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
      updateAvailable: version.id !== version.plugin.latestVersionId,
    }
  }

  async updateInstallation(
    ownerId: string,
    pluginId: string,
    dto: UpdatePluginInstallationDto,
  ): Promise<InstalledPluginVo> {
    const installation = await this.pluginRepository.updateInstallationEnabled(
      ownerId,
      pluginId,
      dto.enabled,
    )
    if (!installation) throw new NotFoundException('未找到该插件的安装记录')

    return {
      pluginId,
      installation: {
        versionId: installation.versionId,
        version: installation.version.version,
        enabled: installation.enabled,
        grantedPermissions: this.readGrantedPermissions(installation.grantedPermissions),
      },
      updateAvailable: installation.versionId !== installation.plugin.latestVersionId,
    }
  }

  async uninstall(ownerId: string, pluginId: string): Promise<UninstalledPluginVo> {
    const result = await this.pluginRepository.removeInstallationIfUnused(ownerId, pluginId)
    if (result.status === 'not-found') throw new NotFoundException('未找到该插件的安装记录')
    if (result.status === 'in-use') {
      throw new ConflictException(`该插件仍被 ${result.usage.workflowCount} 个工作流使用，无法卸载`)
    }
    return { pluginId }
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

    const inspectedPackage = this.packageInspector.inspect(file.buffer),
      { packageName, displayName, description, version } = inspectedPackage.manifest.plugin,
      firstNode = inspectedPackage.manifest.nodes[0],
      originalFileName = file.originalname.replaceAll('\\', '/').split('/').at(-1) ?? ''
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
    icon: string | null
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
    const currentInstallation = plugin.installations[0],
      installation = currentInstallation
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
      icon: plugin.icon,
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
