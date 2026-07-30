export interface StudioAppListItem {
  id: string
  title: string
  author: string
  editedAtLabel: string
  description?: string
  icon?: string
}

export type StudioAppAction = 'edit' | 'duplicate' | 'export-dsl' | 'delete'

export type StudioAppActionHandler = (action: StudioAppAction, app: StudioAppListItem) => void
