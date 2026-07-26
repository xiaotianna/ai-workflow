import { ResourceActionMenu } from '@/components/resource-action-menu'
import type { ActionMenuAction } from '@/components/action-menu-content'

interface StudioAppActionMenuProps {
  title: string
  actions: readonly ActionMenuAction[]
}

export function StudioAppActionMenu({ title, actions }: StudioAppActionMenuProps) {
  return <ResourceActionMenu title={title} actions={actions} />
}
