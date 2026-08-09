import type {
  PluginInstallationDto,
  PluginPermission,
  PluginUsageDto,
  PluginVisibility,
} from '@/api/plugins'

export interface PluginListItem {
  id: string
  packageName?: string
  title: string
  author: string
  verified?: boolean
  installCount: number
  description: string
  tags: string[]
  icon: string | null
  visibility?: PluginVisibility
  latestVersion: {
    id: string
    version: string
    publishedAt: string
    permissions: PluginPermission[]
  }
  installation: PluginInstallationDto | null
  updateAvailable: boolean
  usage?: PluginUsageDto
}

export interface PluginVersion {
  id: string
  version: string
  publishedAt: string
  author: string
  changelog: string
  permissions: PluginPermission[]
}

export type PluginVersionHistory = readonly [PluginVersion, ...PluginVersion[]]

export interface PluginDetail extends PluginListItem {
  content: string
  usage: PluginUsageDto
  versions: PluginVersionHistory
}
