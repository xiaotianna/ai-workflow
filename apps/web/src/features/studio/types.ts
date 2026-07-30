import type { StudioAppSort as ApiStudioAppSort } from '@/api/studio'

export interface StudioAppListItem {
  id: string
  title: string
  author: string
  editedAtLabel: string
  createdAt: string
  updatedAt: string
  description?: string
  icon?: string
}

export type StudioAppSort = ApiStudioAppSort

export type StudioAppAction = 'edit' | 'duplicate' | 'export-dsl' | 'delete'

export type StudioAppActionHandler = (action: StudioAppAction, app: StudioAppListItem) => void
