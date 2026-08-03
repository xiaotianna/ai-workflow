import {
  nodeRegistry,
  validateExecutorWorkflow,
  validateWorkflow,
  workflowSchema,
} from '@ai-workflow/core'
import { showToast } from '@ai-workflow/ui/lib/toast'
import { useState } from 'react'

import { toWorkflowNode } from '@/utils/workflow/editor-transform'

import type { useWorkflowEditor } from './use-workflow-editor'
import type { WorkflowTestRunRequest, WorkflowTestRunResult } from './use-workflow-test-run'
import type { WorkflowCheckListIssue } from '../utils/workflow-check-list'
import {
  downloadWorkflowApplicationDsl,
  parseWorkflowApplicationDsl,
  type WorkflowApplicationMetadata,
} from '../utils/workflow-application-dsl'

type WorkflowEditor = ReturnType<typeof useWorkflowEditor>

interface UseWorkflowOperationsOptions {
  applicationMetadata?: WorkflowApplicationMetadata
  checkListIssues?: readonly WorkflowCheckListIssue[]
  editor: WorkflowEditor
  onCheckListRequired?: () => void
  onPauseTestRun?: () => Promise<void>
  onPublish?: (snapshot: ReturnType<WorkflowEditor['createSnapshot']>) => Promise<unknown>
  onTestRun?: (request: WorkflowTestRunRequest) => Promise<WorkflowTestRunResult>
  onTestRunStart?: () => void
  publishPending?: boolean
  testRunCanPause?: boolean
  testRunPausing?: boolean
  testRunPending?: boolean
}

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback
}

export function useWorkflowOperations({
  applicationMetadata,
  checkListIssues = [],
  editor,
  onCheckListRequired,
  onPauseTestRun,
  onPublish,
  onTestRun,
  onTestRunStart,
  publishPending = false,
  testRunCanPause = false,
  testRunPausing = false,
  testRunPending = false,
}: UseWorkflowOperationsOptions) {
  const [importDialogOpen, setImportDialogOpen] = useState(false)

  async function testRun(input: Record<string, unknown> = {}) {
    if (testRunPending) return

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

    onTestRunStart?.()

    try {
      const result = await onTestRun({
        mode: 'FULL',
        input,
        snapshot: { ...snapshot, workflow: parsedWorkflow.data },
      })
      if (result.status === 'CANCELLED') {
        showToast('info', '测试运行已暂停')
        return
      }
      showToast('success', '测试运行成功')
    } catch (error) {
      showToast('error', getErrorMessage(error, '测试运行失败'))
    }
  }

  async function runNode(nodeId: string) {
    if (testRunPending) return

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

    if (!onTestRun) {
      showToast('info', '节点运行服务尚未接入')
      return
    }

    const snapshot = editor.createSnapshot()
    const node = {
      ...toWorkflowNode(canvasNode),
      config: parsedConfig.data,
    }

    onTestRunStart?.()

    try {
      const result = await onTestRun({
        mode: 'SINGLE_NODE',
        targetNodeId: node.id,
        snapshot,
      })
      if (result.status === 'CANCELLED') {
        showToast('info', `“${node.label ?? nodeType.definition.label}”运行已暂停`)
        return
      }
      showToast('success', `“${node.label ?? nodeType.definition.label}”运行成功`)
    } catch (error) {
      showToast('error', getErrorMessage(error, '节点运行失败'))
    }
  }

  async function pauseTestRun() {
    if (!testRunPending || !testRunCanPause || testRunPausing || !onPauseTestRun) return

    try {
      await onPauseTestRun()
    } catch {
      // 普通取消接口错误已由统一 API Client 展示，避免重复 Toast。
    }
  }

  async function publish() {
    if (publishPending) return

    if (checkListIssues.length > 0) {
      onCheckListRequired?.()
      showToast('error', '检查清单存在问题，修复后才可发布')
      return
    }

    const snapshot = editor.createSnapshot()
    const parsedWorkflow = workflowSchema.safeParse(snapshot.workflow)

    if (!parsedWorkflow.success) {
      showToast('error', parsedWorkflow.error.issues[0]?.message ?? '工作流结构无效')
      return
    }

    // 兜底：检查清单会跳过无法映射到节点的 workflow 级执行前问题
    const issues = validateExecutorWorkflow(parsedWorkflow.data, nodeRegistry)
    if (issues.length > 0) {
      showToast('error', issues[0]?.message ?? '工作流暂时无法发布')
      return
    }

    if (!onPublish) {
      showToast('info', '工作流发布服务尚未接入')
      return
    }

    try {
      await onPublish({
        ...snapshot,
        workflow: parsedWorkflow.data,
      })
      showToast('success', '工作流发布成功')
    } catch {
      // 请求错误已由统一 API Client 展示，避免重复 Toast。
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
    pauseTestRun,
    publish,
    publishPending,
    runNode,
    setImportDialogOpen,
    testRun,
    testRunCanPause,
    testRunPausing,
    testRunPending,
  }
}
