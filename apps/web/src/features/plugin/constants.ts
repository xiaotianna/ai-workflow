import {
  Bot,
  Brain,
  Database,
  Hammer,
  MousePointerClick,
  Package,
  Puzzle,
  ToyBrick,
  type LucideIcon,
} from 'lucide-react'

export type PluginCategoryId =
  | 'all'
  | 'models'
  | 'tools'
  | 'data-sources'
  | 'agent-strategies'
  | 'triggers'
  | 'extensions'
  | 'bundles'

export interface PluginCategory {
  id: PluginCategoryId
  label: string
  icon: LucideIcon
}

export const pluginCategories: PluginCategory[] = [
  { id: 'all', label: '所有集成', icon: ToyBrick },
  { id: 'models', label: '模型', icon: Brain },
  { id: 'tools', label: '工具', icon: Hammer },
  { id: 'data-sources', label: '数据源', icon: Database },
  { id: 'agent-strategies', label: 'Agent 策略', icon: Bot },
  { id: 'triggers', label: '触发器', icon: MousePointerClick },
  { id: 'extensions', label: '扩展', icon: Puzzle },
  { id: 'bundles', label: '集成包', icon: Package },
]
