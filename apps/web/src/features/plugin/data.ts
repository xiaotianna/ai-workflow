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
    icon: plugin.icon,
    visibility: plugin.visibility,
    latestVersion: plugin.latestVersion,
    installation: plugin.installation,
    updateAvailable: plugin.updateAvailable,
  }
}

export function toPluginDetail(plugin: PluginDetailDto): PluginDetail {
  const listItem = toPluginListItem(plugin)
  const [latestVersion, ...previousVersions] = plugin.versions
  if (!latestVersion) throw new Error(`插件 ${plugin.id} 缺少版本`)

  return {
    ...listItem,
    content: plugin.content,
    usage: plugin.usage,
    versions: [
      {
        id: latestVersion.id,
        version: latestVersion.version,
        publishedAt: latestVersion.publishedAt,
        author: latestVersion.author,
        changelog: latestVersion.changelog,
        permissions: latestVersion.permissions,
      },
      ...previousVersions.map((version) => ({
        id: version.id,
        version: version.version,
        publishedAt: version.publishedAt,
        author: version.author,
        changelog: version.changelog,
        permissions: version.permissions,
      })),
    ],
  }
}
