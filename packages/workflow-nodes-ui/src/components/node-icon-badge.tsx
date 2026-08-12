import { cn } from '@ai-workflow/ui/lib/utils'
import { useEffect, useState } from 'react'

import { NODE_THEMES, getNodeThemeColor } from '../common/node-theme-map'
import { NodeIcon, resolveNodeIconKind } from './node-icon'

export interface NodeIconBadgeProps {
  type: string
  icon?: string
  className?: string
}

export function NodeIconBadge({ type, icon, className }: NodeIconBadgeProps) {
  const [imageFailed, setImageFailed] = useState(false)

  useEffect(() => {
    setImageFailed(false)
  }, [icon])

  const kind = resolveNodeIconKind(icon),
    showPluginIcon = kind === 'plugin' && !imageFailed,
    showUnknownIcon = kind === 'unknown' || imageFailed

  return (
    <span
      className={cn(
        'flex size-6 shrink-0 items-center justify-center',
        showPluginIcon && 'overflow-hidden',
        !showPluginIcon && 'text-primary-foreground',
        className,
      )}
      style={
        showPluginIcon
          ? undefined
          : {
              backgroundColor: showUnknownIcon ? NODE_THEMES.unknown : getNodeThemeColor(type),
            }
      }
    >
      {showPluginIcon ? (
        <NodeIcon
          icon={icon}
          className="size-full"
          onImageError={() => setImageFailed(true)}
          aria-hidden
        />
      ) : (
        <NodeIcon icon={showUnknownIcon ? undefined : icon} className="size-4" aria-hidden />
      )}
    </span>
  )
}
