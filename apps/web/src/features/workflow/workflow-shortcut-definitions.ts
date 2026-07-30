export interface WorkflowShortcutDefinition {
  id: string
  label: string
  keys: readonly (readonly string[])[]
}

export interface WorkflowShortcutGroup {
  id: string
  label: string
  shortcuts: readonly WorkflowShortcutDefinition[]
}

export const WORKFLOW_SHORTCUT_GROUPS: readonly WorkflowShortcutGroup[] = [
  {
    id: 'document',
    label: '工作流',
    shortcuts: [
      { id: 'save', label: '保存工作流', keys: [['⌘ / Ctrl', 'S']] },
      { id: 'undo', label: '撤销', keys: [['⌘ / Ctrl', 'Z']] },
      {
        id: 'redo',
        label: '重做',
        keys: [
          ['⌘ / Ctrl', 'Shift', 'Z'],
          ['Ctrl', 'Y'],
        ],
      },
      { id: 'auto-layout', label: '自动整理布局', keys: [['Shift', 'L']] },
    ],
  },
  {
    id: 'selection',
    label: '选择与编辑',
    shortcuts: [
      { id: 'select-all', label: '全选节点', keys: [['⌘ / Ctrl', 'A']] },
      { id: 'copy', label: '复制', keys: [['⌘ / Ctrl', 'C']] },
      { id: 'cut', label: '剪切', keys: [['⌘ / Ctrl', 'X']] },
      { id: 'paste', label: '粘贴', keys: [['⌘ / Ctrl', 'V']] },
      { id: 'duplicate', label: '快速复制', keys: [['⌘ / Ctrl', 'D']] },
      {
        id: 'delete',
        label: '删除选中节点或连线',
        keys: [['Delete'], ['Backspace']],
      },
      { id: 'nudge', label: '移动选中节点', keys: [['方向键']] },
    ],
  },
  {
    id: 'panels',
    label: '面板',
    shortcuts: [
      { id: 'add-node', label: '打开添加节点', keys: [['Shift', 'A']] },
      { id: 'open-node', label: '打开选中节点配置', keys: [['Enter']] },
      { id: 'dismiss', label: '关闭面板或清除选择', keys: [['Esc']] },
    ],
  },
]
