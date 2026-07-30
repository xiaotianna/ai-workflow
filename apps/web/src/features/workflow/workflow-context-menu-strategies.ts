import {
  WorkflowContextMenuActionRegistry,
  type WorkflowContextMenuActionStrategy,
  type WorkflowContextMenuStrategyContext,
} from './workflow-context-menu-registry'

function getNodeId(context: WorkflowContextMenuStrategyContext) {
  return context.target.scope === 'node' ? context.target.nodeId : undefined
}

const addNodeStrategy: WorkflowContextMenuActionStrategy = {
  id: 'canvas.add-node',
  scope: 'canvas',
  label: '添加节点',
  order: 10,
  shortcutId: 'add-node',
  keepMenuOpenAfterSelect: true,
  execute: ({ actionAnchorPosition, nodePicker, target }) => {
    if (target.scope === 'canvas') {
      nodePicker.openAddNode(target.position, actionAnchorPosition ?? target.screenPosition)
    }
  },
}

const testRunStrategy: WorkflowContextMenuActionStrategy = {
  id: 'canvas.test-run',
  scope: 'canvas',
  label: '测试运行',
  order: 20,
  shortcutId: 'test-run',
  execute: ({ operations }) => void operations.testRun(),
}

const pasteStrategy: WorkflowContextMenuActionStrategy = {
  id: 'canvas.paste',
  scope: 'canvas',
  label: '粘贴到这里',
  order: 30,
  shortcutId: 'paste',
  isDisabled: ({ editor }) => !editor.canPaste,
  execute: ({ editor, target }) => {
    if (target.scope === 'canvas') editor.pasteSelectionAt(target.position)
  },
}

const exportDslStrategy: WorkflowContextMenuActionStrategy = {
  id: 'canvas.export-dsl',
  scope: 'canvas',
  label: '导出 DSL',
  order: 40,
  separatorBefore: true,
  execute: ({ operations }) => operations.exportDsl(),
}

const importApplicationStrategy: WorkflowContextMenuActionStrategy = {
  id: 'canvas.import-application',
  scope: 'canvas',
  label: '导入应用',
  order: 50,
  execute: ({ operations }) => operations.openImportDialog(),
}

const runNodeStrategy: WorkflowContextMenuActionStrategy = {
  id: 'node.run',
  scope: 'node',
  label: '运行该节点',
  order: 10,
  isDisabled: (context) => {
    const nodeId = getNodeId(context)
    return !nodeId || !context.editor.canRunNode(nodeId)
  },
  execute: (context) => {
    const nodeId = getNodeId(context)
    if (nodeId) void context.operations.runNode(nodeId)
  },
}

const replaceNodeStrategy: WorkflowContextMenuActionStrategy = {
  id: 'node.replace',
  scope: 'node',
  label: '更换节点',
  order: 20,
  keepMenuOpenAfterSelect: true,
  isDisabled: (context) => {
    const nodeId = getNodeId(context)
    return !nodeId || !context.editor.canReplaceNode(nodeId)
  },
  execute: (context) => {
    const nodeId = getNodeId(context)
    if (nodeId) {
      context.nodePicker.openReplaceNode(
        nodeId,
        context.actionAnchorPosition ?? context.target.screenPosition,
      )
    }
  },
}

const copyNodeStrategy: WorkflowContextMenuActionStrategy = {
  id: 'node.copy',
  scope: 'node',
  label: '拷贝',
  order: 30,
  shortcutId: 'copy',
  separatorBefore: true,
  isDisabled: (context) => {
    const nodeId = getNodeId(context)
    return !nodeId || !context.editor.canCopyNode(nodeId)
  },
  execute: (context) => {
    const nodeId = getNodeId(context)
    if (nodeId) context.editor.copyNode(nodeId)
  },
}

const duplicateNodeStrategy: WorkflowContextMenuActionStrategy = {
  id: 'node.duplicate',
  scope: 'node',
  label: '复制',
  order: 40,
  shortcutId: 'duplicate',
  isDisabled: (context) => {
    const nodeId = getNodeId(context)
    return !nodeId || !context.editor.canDuplicateNode(nodeId)
  },
  execute: (context) => {
    const nodeId = getNodeId(context)
    if (nodeId) context.editor.duplicateNode(nodeId)
  },
}

const deleteNodeStrategy: WorkflowContextMenuActionStrategy = {
  id: 'node.delete',
  scope: 'node',
  label: '删除',
  order: 50,
  shortcutId: 'delete',
  destructive: true,
  isDisabled: (context) => {
    const nodeId = getNodeId(context)
    return !nodeId || !context.editor.canDeleteNode(nodeId)
  },
  execute: (context) => {
    const nodeId = getNodeId(context)
    if (nodeId) context.editor.deleteNode(nodeId)
  },
}

export const workflowContextMenuActionRegistry =
  new WorkflowContextMenuActionRegistry().registerAll([
    addNodeStrategy,
    testRunStrategy,
    pasteStrategy,
    exportDslStrategy,
    importApplicationStrategy,
    runNodeStrategy,
    replaceNodeStrategy,
    copyNodeStrategy,
    duplicateNodeStrategy,
    deleteNodeStrategy,
  ])
