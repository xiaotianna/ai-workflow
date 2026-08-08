import type { LucideIcon } from 'lucide-react'

import type { PluginVisibility } from '@/api/plugins'

export interface PluginListItem {
  id: string
  packageName?: string
  title: string
  author: string
  verified?: boolean
  installCount: number
  description: string
  tags: string[]
  icon: LucideIcon
  visibility?: PluginVisibility
  latestVersion?: {
    version: string
    publishedAt: string
  }
}

export interface PluginVersion {
  version: string
  publishedAt: string
  author: string
  changelog: string
}

export type PluginVersionHistory = readonly [PluginVersion, ...PluginVersion[]]

export interface PluginDetail extends PluginListItem {
  content: string
  versions: PluginVersionHistory
}
