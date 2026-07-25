import type { LucideProps } from 'lucide-react'
import { NODE_ICONS } from '../common/node-icon-map'
import type { NodeIconName } from '../common/node-icon-map'

export interface NodeIconProps extends Omit<LucideProps, 'ref'> {
  icon?: string
}

export function NodeIcon({ icon, ...props }: NodeIconProps) {
  const Icon = NODE_ICONS[icon as NodeIconName] ?? NODE_ICONS.unknown
  return <Icon {...props} />
}
