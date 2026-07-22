import type { ResourceKind } from '@/components/resource-card'

export interface StudioAppListItem {
  id: string
  title: string
  kind: ResourceKind
  kindLabel: string
  author: string
  editedAtLabel: string
  description?: string
  icon?: string
}

export interface CreateStudioAppInput {
  title: string
  icon: string
  description?: string
}
