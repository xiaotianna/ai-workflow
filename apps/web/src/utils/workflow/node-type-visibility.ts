import { BuiltinNodeType } from '@ai-workflow/core'

export const LOOP_SYSTEM_NODE_TYPES: ReadonlySet<string> = new Set([
  BuiltinNodeType.LOOP_START,
  BuiltinNodeType.LOOP_EXIT,
])

export const isLoopSystemNodeType = (type: string): boolean => LOOP_SYSTEM_NODE_TYPES.has(type)

// 外层画布不展示的节点
export const ROOT_HIDDEN_NODE_TYPES = LOOP_SYSTEM_NODE_TYPES

// loop画布不展示的节点
export const LOOP_UNAVAILABLE_NODE_TYPES: ReadonlySet<string> = new Set([
  BuiltinNodeType.START,
  BuiltinNodeType.END,
  ...LOOP_SYSTEM_NODE_TYPES,
])
