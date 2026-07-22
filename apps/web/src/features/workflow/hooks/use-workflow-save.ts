import type { WorkflowCanvasNode, WorkflowEditorSnapshot } from '@/components/workflow/types'
import { toWorkflow, toWorkflowEditorLayout } from '@/utils/workflow/editor-transform'
import {
  nodeRegistry,
  validateWorkflow,
  workflowSchema,
  type Workflow,
  type WorkflowEdge,
} from '@ai-workflow/core'
import type { Viewport } from '@xyflow/react'
import { useState } from 'react'

interface UseWorkflowSaveOptions {
  baseWorkflow: Workflow
  nodes: readonly WorkflowCanvasNode[]
  edges: readonly WorkflowEdge[]
  viewport?: Viewport
  onSave: (snapshot: WorkflowEditorSnapshot) => void | Promise<void>
  onSaved: () => void
}

/**
 * 管理编辑器保存用例
 * 只有结构校验和业务校验都通过后，才把页面交给外层数据接入
 */
export function useWorkflowSave({
  baseWorkflow,
  edges,
  nodes,
  onSave,
  onSaved,
  viewport,
}: UseWorkflowSaveOptions) {
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<string[]>([])

  /** 校验并保存当前编辑快照；失败时保留画布状态，供用户继续修正。 */
  async function saveWorkflow() {
    if (saving) return

    const rawWorkflow = toWorkflow(baseWorkflow, nodes, edges)
    const parsedWorkflow = workflowSchema.safeParse(rawWorkflow)

    if (!parsedWorkflow.success) {
      setErrors(
        parsedWorkflow.error.issues.map(
          (issue) => `${issue.path.join('.') || 'workflow'}：${issue.message}`,
        ),
      )
      return
    }

    const validationIssues = validateWorkflow(parsedWorkflow.data, nodeRegistry)

    if (validationIssues.length > 0) {
      setErrors(validationIssues.map((issue) => issue.message))
      return
    }

    setSaving(true)
    setErrors([])

    try {
      await onSave({
        workflow: parsedWorkflow.data,
        layout: toWorkflowEditorLayout(nodes, viewport),
      })
      onSaved()
    } catch (error) {
      setErrors([error instanceof Error ? error.message : '保存工作流失败'])
    } finally {
      setSaving(false)
    }
  }

  return {
    errors,
    saveWorkflow,
    saving,
  }
}
