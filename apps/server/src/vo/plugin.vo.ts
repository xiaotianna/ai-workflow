import type { PluginVisibilityValue } from '@/dto/plugin.dto'
import type { PluginManifest, PluginPermission } from '@ai-workflow/plugin'
import type { WorkflowPluginLock } from '@ai-workflow/core'

export interface PluginInstallationVo {
  versionId: string
  version: string
  enabled: boolean
  grantedPermissions: PluginPermission[]
}

export interface PluginListItemVo {
  id: string
  packageName: string
  name: string
  description: string
  icon: string | null
  author: {
    id: string
    username: string
  }
  verified: boolean
  visibility: PluginVisibilityValue
  installCount: number
  latestVersion: {
    id: string
    version: string
    publishedAt: Date
    permissions: PluginPermission[]
  }
  installation: PluginInstallationVo | null
  updateAvailable: boolean
  createdAt: Date
  updatedAt: Date
}

export interface PluginListVo {
  items: PluginListItemVo[]
  nextCursor: string | null
}

export interface PluginDetailVo extends PluginListItemVo {
  content: string
  versions: Array<{
    id: string
    version: string
    publishedAt: Date
    author: string
    changelog: string
    permissions: PluginPermission[]
  }>
}

export interface InstalledPluginVo {
  pluginId: string
  installation: PluginInstallationVo
  updateAvailable: boolean
}

export interface UninstalledPluginVo {
  pluginId: string
}

export interface PublishedPluginVersionVo {
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

export interface PluginRuntimeCatalogVo {
  fingerprint: string
  pluginLock: WorkflowPluginLock
  plugins: Array<{
    pluginId: string
    versionId: string
    version: string
    artifactDigest: string
    manifest: PluginManifest
  }>
}
