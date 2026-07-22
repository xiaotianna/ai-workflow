import type { ActionMenuAction } from '@/components/action-menu-content'

import type { StudioAppActionHandler, StudioAppListItem } from '../types'

interface GetStudioAppActionsOptions {
  onImportDsl?: () => void
}

export function getStudioAppActions(
  app: StudioAppListItem,
  onAppAction?: StudioAppActionHandler,
  { onImportDsl }: GetStudioAppActionsOptions = {},
): readonly ActionMenuAction[] {
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
    ...(onImportDsl
      ? [
          {
            id: 'import-dsl',
            label: '导入 DSL',
            onSelect: onImportDsl,
          },
        ]
      : []),
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
