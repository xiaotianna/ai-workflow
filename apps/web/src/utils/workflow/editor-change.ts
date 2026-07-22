/**
 * 判断react flow的变化是否真的修改了需要保存的数据
 */

import type { WorkflowCanvasNode } from '@/components/workflow/types'
import type { WorkflowEdge } from '@ai-workflow/core'
import type { EdgeChange, NodeChange } from '@xyflow/react'

// 判断节点是否改变（新增、删除、替换、位置变化）
export const hasNodeMutation = (changes: readonly NodeChange<WorkflowCanvasNode>[]) => {
  return changes.some(
    (change) =>
      change.type === 'add' ||
      change.type === 'remove' ||
      change.type === 'replace' ||
      change.type === 'position',
  )
}

// 判断边是否改变（新增、删除、替换）
export const hasEdgeMutation = (changes: readonly EdgeChange<WorkflowEdge>[]) => {
  return changes.some(
    (change) => change.type === 'add' || change.type === 'remove' || change.type === 'replace',
  )
}
