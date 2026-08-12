import type { WorkflowCanvasNode } from '@/components/workflow/types'
import { BuiltinNodeType } from '@ai-workflow/core'
import type { XYPosition } from '@xyflow/react'

const LOOP_CHILD_START_POSITION = {
    x: 32,
    y: 276,
  },
  LOOP_CHILD_VERTICAL_GAP = 32,
  DEFAULT_LOOP_CHILD_HEIGHT = 140

/**
 * 计算 Loop 新增直接子节点的位置
 * 使用纵向排列，能兼容普通节点和尺寸更大的嵌套 Loop
 */
export function getNextLoopChildPosition(
  loopId: string,
  nodes: readonly WorkflowCanvasNode[],
): XYPosition {
  const children = nodes.filter(
      (node) =>
        node.parentId === loopId &&
        node.type !== BuiltinNodeType.LOOP_START &&
        node.type !== BuiltinNodeType.LOOP_EXIT,
    ),
    nextY = children.reduce((maxBottom, node) => {
      const styleHeight = typeof node.style?.height === 'number' ? node.style.height : undefined,
        height = node.measured?.height ?? styleHeight ?? DEFAULT_LOOP_CHILD_HEIGHT

      return Math.max(maxBottom, node.position.y + height + LOOP_CHILD_VERTICAL_GAP)
    }, LOOP_CHILD_START_POSITION.y)

  return {
    x: LOOP_CHILD_START_POSITION.x,
    y: nextY,
  }
}
