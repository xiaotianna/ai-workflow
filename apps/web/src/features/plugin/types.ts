import type { LucideIcon } from 'lucide-react'

import type { PluginCategoryId } from './constants'

export interface PluginListItem {
  id: string
  slug?: string
  title: string
  author: string
  verified?: boolean
  installCount: number
  description: string
  categoryId: Exclude<PluginCategoryId, 'all'>
  categoryLabel: string
  tags: string[]
  icon: LucideIcon
}

export interface PluginVersion {
  version: string
  publishedAt: string
  publisher: string
  changelog: string
}

export type PluginVersionHistory = readonly [PluginVersion, ...PluginVersion[]]

export interface PluginDetail extends PluginListItem {
  content: string
  versions: PluginVersionHistory
}
