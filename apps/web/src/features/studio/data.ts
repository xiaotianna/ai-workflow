import type { StudioAppDto } from '@/api/studio'

import type { StudioAppListItem } from './types'

export function toStudioAppListItem(app: StudioAppDto): StudioAppListItem {
  return {
    id: app.id,
    title: app.title,
    author: app.author,
    createdAt: app.createdAt,
    updatedAt: app.updatedAt,
    description: app.description,
    icon: app.icon,
  }
}
