import type { LucideProps } from 'lucide-react'
import { NODE_ICONS } from '../common/node-icon-map'
import type { NodeIconName } from '../common/node-icon-map'
import { cn } from '@ai-workflow/ui/lib/utils'

export interface NodeIconProps extends Omit<LucideProps, 'ref'> {
  icon?: string
  onImageError?: () => void
}

export type NodeIconKind = 'builtin' | 'plugin' | 'unknown'

function isImageIcon(icon: string): boolean {
  if (/^(https?:|data:|blob:)/i.test(icon)) return true
  return /\.(svg|png|jpe?g|webp|gif)$/i.test(icon)
}

export function resolveNodeIconKind(icon?: string): NodeIconKind {
  if (!icon) return 'unknown'
  if (icon in NODE_ICONS) return 'builtin'
  if (isImageIcon(icon)) return 'plugin'
  return 'unknown'
}

export function NodeIcon({ icon, className, onImageError, ...props }: NodeIconProps) {
  const kind = resolveNodeIconKind(icon)

  if (kind === 'unknown') {
    const Fallback = NODE_ICONS.unknown
    return <Fallback className={className} {...props} />
  }

  if (kind === 'builtin') {
    const Icon = NODE_ICONS[icon as NodeIconName]
    return <Icon className={className} {...props} />
  }

  return (
    <img
      src={icon}
      alt=""
      aria-hidden={props['aria-hidden'] ?? true}
      onError={onImageError}
      className={cn('object-cover', className)}
    />
  )
}
