import { cn } from '@ai-workflow/ui/lib/utils'
import { Package, type LucideIcon } from 'lucide-react'
import { useEffect, useState } from 'react'

import { apiClient } from '@/api/client'
import { getPluginAssetUrl } from '../asset-url'

export interface PluginIconProps {
  pluginId: string
  versionId: string
  icon?: string | null
  fallback?: LucideIcon
  className?: string
}

export function PluginIcon({
  pluginId,
  versionId,
  icon,
  fallback: Fallback = Package,
  className,
}: PluginIconProps) {
  const [src, setSrc] = useState<string>()

  useEffect(() => {
    if (!icon) {
      setSrc(undefined)
      return
    }

    let cancelled = false,
      objectUrl: string | undefined

    void apiClient
      .getBlob(getPluginAssetUrl(pluginId, versionId, icon))
      .then((response) => {
        if (cancelled) return
        objectUrl = URL.createObjectURL(response.data)
        setSrc(objectUrl)
      })
      .catch(() => {
        if (!cancelled) setSrc(undefined)
      })

    return () => {
      cancelled = true
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [pluginId, versionId, icon])

  if (!icon || !src) {
    return <Fallback aria-hidden className={cn('size-1/2', className)} />
  }

  return <img src={src} alt="" aria-hidden className={cn('size-full object-cover', className)} />
}
