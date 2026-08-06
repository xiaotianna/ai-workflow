import type { LucideIcon } from 'lucide-react'

import type { PluginCategoryId } from './constants'

export interface PluginListItem {
  id: string
  title: string
  author: string
  installCount: number
  description: string
  categoryId: Exclude<PluginCategoryId, 'all'>
  categoryLabel: string
  tags: string[]
  icon: LucideIcon
}
