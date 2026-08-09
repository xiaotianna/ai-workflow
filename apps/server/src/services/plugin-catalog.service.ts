import type { WorkflowPluginDependencyInput } from '@/common/interfaces/workflow-plugin-dependency.interface'
import { PluginRepository } from '@/repositories/plugin.repository'
import type { WorkflowPluginLock } from '@ai-workflow/core'
import { PLUGIN_HOST_VERSION, pluginManifestSchema, type PluginManifest } from '@ai-workflow/plugin'
import { BadRequestException, ConflictException, Injectable } from '@nestjs/common'
import { satisfies } from 'semver'

export interface ResolvedPluginCatalogVersion {
  readonly pluginId: string
  readonly versionId: string
  readonly version: string
  readonly artifactDigest: string
  readonly manifest: PluginManifest
  readonly grantedPermissions: readonly string[]
  readonly dependency: WorkflowPluginDependencyInput
}

interface PluginVersionRecord {
  id: string
  pluginId: string
  version: string
  manifest: unknown
  artifactReference: string | null
  artifactDigest: string
  artifactSize: number | null
  grantedPermissions?: string[]
  plugin?: { installations: Array<{ grantedPermissions: string[] }> }
}

@Injectable()
export class PluginCatalogService {
  constructor(private readonly pluginRepository: PluginRepository) {}

  async resolveWorkflowVersions(
    ownerId: string,
    pluginLock: WorkflowPluginLock,
  ): Promise<readonly ResolvedPluginCatalogVersion[]> {
    const versions = await this.pluginRepository.findInstalledVersions(ownerId, pluginLock)
    const versionByKey = new Map(
      versions.map((version) => [`${version.pluginId}@${version.version}`, version]),
    )

    return pluginLock.map((lock) => {
      const version = versionByKey.get(`${lock.pluginId}@${lock.version}`)
      if (!version) {
        throw new ConflictException(
          `工作流锁定的插件未安装、已停用或版本不存在：${lock.pluginId}@${lock.version}`,
        )
      }
      if (version.artifactDigest.toLowerCase() !== lock.digest.toLowerCase()) {
        throw new ConflictException(`工作流锁定的插件摘要不匹配：${lock.pluginId}@${lock.version}`)
      }
      return this.toResolvedVersion(version)
    })
  }

  async resolveEditorVersions(
    ownerId: string,
    _pluginLock: WorkflowPluginLock,
  ): Promise<readonly ResolvedPluginCatalogVersion[]> {
    const installations = await this.pluginRepository.listEnabledInstallations(ownerId)
    const versions = installations.map((installation) => {
      return this.toResolvedVersion({
        pluginId: installation.pluginId,
        ...installation.version,
        grantedPermissions: installation.grantedPermissions,
      })
    })

    return versions.sort((left, right) => left.pluginId.localeCompare(right.pluginId))
  }

  private toResolvedVersion(version: PluginVersionRecord): ResolvedPluginCatalogVersion {
    if (!version.artifactReference) {
      throw new ConflictException(`插件版本缺少制品引用：${version.pluginId}@${version.version}`)
    }
    const manifestResult = pluginManifestSchema.safeParse(version.manifest)
    if (!manifestResult.success) {
      throw new ConflictException(`插件版本 Manifest 无效：${version.pluginId}@${version.version}`)
    }
    if (!satisfies(PLUGIN_HOST_VERSION, manifestResult.data.hostVersionRange)) {
      throw new BadRequestException(
        `插件版本与当前宿主不兼容：${version.pluginId}@${version.version}`,
      )
    }

    return {
      pluginId: version.pluginId,
      versionId: version.id,
      version: version.version,
      artifactDigest: version.artifactDigest,
      manifest: manifestResult.data,
      grantedPermissions: Object.freeze([
        ...(version.grantedPermissions ??
          version.plugin?.installations[0]?.grantedPermissions ??
          []),
      ]),
      dependency: {
        pluginVersionId: version.id,
        manifest: manifestResult.data,
        artifactReference: version.artifactReference,
        artifactDigest: version.artifactDigest,
        artifactSize: version.artifactSize ?? undefined,
      },
    }
  }
}
