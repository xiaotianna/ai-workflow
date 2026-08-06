import type { PluginListItem } from './types'

export function getPluginDetailPath(plugin: Pick<PluginListItem, 'author' | 'id'>) {
  return `/plugin/${encodeURIComponent(plugin.author)}/${encodeURIComponent(plugin.id)}`
}
