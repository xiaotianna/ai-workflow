import type { StudioAppDto } from '@/api/studio'

import type { StudioAppListItem } from './types'

const editedAtFormatter = new Intl.DateTimeFormat('zh-CN', {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
})

export function toStudioAppListItem(app: StudioAppDto): StudioAppListItem {
  const updatedAt = new Date(app.updatedAt)

  return {
    id: app.id,
    title: app.title,
    author: app.author,
    editedAtLabel: Number.isNaN(updatedAt.getTime())
      ? app.updatedAt
      : editedAtFormatter.format(updatedAt),
    createdAt: app.createdAt,
    updatedAt: app.updatedAt,
    description: app.description,
    icon: app.icon,
  }
}
