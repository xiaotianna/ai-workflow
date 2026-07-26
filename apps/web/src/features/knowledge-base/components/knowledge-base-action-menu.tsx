import { ResourceActionMenu } from '@/components/resource-action-menu'
import type { ActionMenuAction } from '@/components/action-menu-content'

interface KnowledgeBaseActionMenuProps {
  title: string
  actions: readonly ActionMenuAction[]
}

export function KnowledgeBaseActionMenu({ title, actions }: KnowledgeBaseActionMenuProps) {
  return <ResourceActionMenu title={title} actions={actions} />
}
