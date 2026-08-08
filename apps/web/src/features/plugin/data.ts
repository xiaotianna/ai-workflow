import { Package } from 'lucide-react'

import type { PluginDetailDto, PluginListItemDto } from '@/api/plugins'
import type { PluginDetail, PluginListItem } from './types'

export function formatPluginInstallCount(count: number) {
  return count.toLocaleString('zh-CN')
}

export function toPluginListItem(plugin: PluginListItemDto): PluginListItem {
  return {
    id: plugin.id,
    packageName: plugin.packageName,
    title: plugin.name,
    author: plugin.author.username,
    verified: plugin.verified,
    installCount: plugin.installCount,
    description: plugin.description,
    tags: [],
    icon: Package,
    visibility: plugin.visibility,
    latestVersion: plugin.latestVersion,
  }
}

export function toPluginDetail(plugin: PluginDetailDto): PluginDetail {
  const listItem = toPluginListItem(plugin)
  const [latestVersion, ...previousVersions] = plugin.versions
  if (!latestVersion) throw new Error(`插件 ${plugin.id} 缺少版本`)

  return {
    ...listItem,
    content: plugin.content,
    versions: [
      {
        version: latestVersion.version,
        publishedAt: latestVersion.publishedAt,
        author: latestVersion.author,
        changelog: latestVersion.changelog,
      },
      ...previousVersions.map((version) => ({
        version: version.version,
        publishedAt: version.publishedAt,
        author: version.author,
        changelog: version.changelog,
      })),
    ],
  }
}
