import type { PluginListItem } from './types'

export function getPluginDetailPath(plugin: Pick<PluginListItem, 'id'>) {
  return `/plugin/${encodeURIComponent(plugin.id)}`
}
