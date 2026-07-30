import {
  nodeRegistry,
  validateExecutorWorkflow,
  validateWorkflow,
  workflowSchema,
  type WorkflowNode,
} from '@ai-workflow/core'
import { showToast } from '@ai-workflow/ui/lib/toast'
import { useState } from 'react'

import type { WorkflowEditorSnapshot } from '@/components/workflow/types'
import { toWorkflowNode } from '@/utils/workflow/editor-transform'

import type { useWorkflowEditor } from './use-workflow-editor'
import {
  downloadWorkflowApplicationDsl,
  parseWorkflowApplicationDsl,
  type WorkflowApplicationMetadata,
} from '../utils/workflow-application-dsl'

type WorkflowEditor = ReturnType<typeof useWorkflowEditor>

interface UseWorkflowOperationsOptions {
  applicationMetadata?: WorkflowApplicationMetadata
  editor: WorkflowEditor
  onRunNode?: (node: WorkflowNode, snapshot: WorkflowEditorSnapshot) => unknown | Promise<unknown>
  onTestRun?: (snapshot: WorkflowEditorSnapshot) => unknown | Promise<unknown>
}

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback
}

export function useWorkflowOperations({
  applicationMetadata,
  editor,
  onRunNode,
  onTestRun,
}: UseWorkflowOperationsOptions) {
  const [importDialogOpen, setImportDialogOpen] = useState(false)

  async function testRun() {
    const snapshot = editor.createSnapshot()
    const parsedWorkflow = workflowSchema.safeParse(snapshot.workflow)

    if (!parsedWorkflow.success) {
      showToast('error', parsedWorkflow.error.issues[0]?.message ?? '工作流结构无效')
      return
    }

    const issues = validateExecutorWorkflow(parsedWorkflow.data, nodeRegistry)

    if (issues.length > 0) {
      showToast('error', issues[0]?.message ?? '工作流暂时无法运行')
      return
    }

    if (!onTestRun) {
      showToast('info', '测试运行服务尚未接入')
      return
    }

    try {
      await onTestRun({ ...snapshot, workflow: parsedWorkflow.data })
      showToast('success', '测试运行已提交')
    } catch (error) {
      showToast('error', getErrorMessage(error, '测试运行失败'))
    }
  }

  async function runNode(nodeId: string) {
    if (!editor.canRunNode(nodeId)) {
      showToast('error', '当前节点不可单独运行')
      return
    }

    const canvasNode = editor.nodes.find((node) => node.id === nodeId)

    if (!canvasNode) {
      showToast('error', '节点不存在或已被删除')
      return
    }

    const nodeType = nodeRegistry.get(canvasNode.type)
    const parsedConfig = nodeType?.schema.safeParse(canvasNode.data.config)

    if (!nodeType || !parsedConfig?.success) {
      showToast('error', '节点配置不完整，无法运行')
      return
    }

    if (!onRunNode) {
      showToast('info', '节点运行服务尚未接入')
      return
    }

    const snapshot = editor.createSnapshot()
    const node = {
      ...toWorkflowNode(canvasNode),
      config: parsedConfig.data,
    }

    try {
      await onRunNode(node, snapshot)
      showToast('success', `“${node.label ?? nodeType.definition.label}”已提交运行`)
    } catch (error) {
      showToast('error', getErrorMessage(error, '节点运行失败'))
    }
  }

  function exportDsl() {
    downloadWorkflowApplicationDsl(editor.createSnapshot(), applicationMetadata)
    showToast('success', 'DSL 已导出')
  }

  function importDsl(value: unknown) {
    try {
      const snapshot = parseWorkflowApplicationDsl(value)
      const issues = validateWorkflow(snapshot.workflow, nodeRegistry)

      if (issues.length > 0) {
        throw new Error(issues[0]?.message ?? '应用 DSL 中的工作流无效')
      }

      editor.replaceCanvas(snapshot)
      showToast('success', '应用已导入，当前画布已被覆盖')
    } catch (error) {
      showToast('error', getErrorMessage(error, '应用导入失败'))
      throw error
    }
  }

  return {
    exportDsl,
    importDialogOpen,
    importDsl,
    openImportDialog: () => setImportDialogOpen(true),
    runNode,
    setImportDialogOpen,
    testRun,
  }
}
