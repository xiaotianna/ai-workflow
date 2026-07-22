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

export type StudioAppAction = 'edit' | 'duplicate' | 'export-dsl' | 'delete'

export type StudioAppActionHandler = (action: StudioAppAction, app: StudioAppListItem) => void

export interface CreateStudioAppInput {
  title: string
  icon: string
  description?: string
}
