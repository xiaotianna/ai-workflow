import type { ResourceCardAction } from '@/components/resource-card'

import type { StudioAppActionHandler, StudioAppListItem } from '../types'

export function getStudioAppCardActions(
  app: StudioAppListItem,
  onAppAction?: StudioAppActionHandler,
): readonly ResourceCardAction[] {
  return [
    {
      id: 'edit',
      label: '编辑信息',
      onSelect: () => onAppAction?.('edit', app),
    },
    {
      id: 'duplicate',
      label: '复制',
      onSelect: () => onAppAction?.('duplicate', app),
    },
    {
      id: 'export-dsl',
      label: '导出 DSL',
      onSelect: () => onAppAction?.('export-dsl', app),
    },
    {
      id: 'delete',
      label: '删除',
      destructive: true,
      separatorBefore: true,
      onSelect: () => onAppAction?.('delete', app),
    },
  ]
}
