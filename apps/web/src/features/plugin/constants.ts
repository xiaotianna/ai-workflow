import { History, PackageCheck, ToyBrick, UserRound, type LucideIcon } from 'lucide-react'

export type PluginFilterId = 'all' | 'installed' | 'used' | 'mine'

export interface PluginFilter {
  id: PluginFilterId
  label: string
  icon: LucideIcon
}

export const pluginFilters: PluginFilter[] = [
  { id: 'all', label: '所有集成', icon: ToyBrick },
  { id: 'installed', label: '已安装', icon: PackageCheck },
  { id: 'used', label: '已使用', icon: History },
  { id: 'mine', label: '我发布的插件', icon: UserRound },
]
