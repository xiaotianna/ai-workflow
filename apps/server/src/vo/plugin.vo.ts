import type { PluginVisibilityValue } from '@/dto/plugin.dto'

export interface PluginListItemVo {
  id: string
  packageName: string
  name: string
  description: string
  author: {
    id: string
    username: string
  }
  verified: boolean
  visibility: PluginVisibilityValue
  installCount: number
  latestVersion: {
    version: string
    publishedAt: Date
  }
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
    version: string
    publishedAt: Date
    author: string
    changelog: string
  }>
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
