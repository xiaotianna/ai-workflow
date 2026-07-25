import { BuiltinNodeType } from '@ai-workflow/core'

// 外层画布不展示的节点
export const ROOT_HIDDEN_NODE_TYPES: ReadonlySet<string> = new Set([
  BuiltinNodeType.LOOP_START,
  BuiltinNodeType.LOOP_EXIT,
])

// loop画布不展示的节点
export const LOOP_UNAVAILABLE_NODE_TYPES: ReadonlySet<string> = new Set([
  BuiltinNodeType.START,
  BuiltinNodeType.END,
  BuiltinNodeType.LOOP_START,
  BuiltinNodeType.LOOP_EXIT,
])
