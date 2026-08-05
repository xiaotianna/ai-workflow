export const BuiltinNodeType = {
  START: 'start',
  END: 'end',
  LLM: 'llm',
  RAG: 'rag',
  CODE: 'code',
  HTTP: 'http',
  LOOP: 'loop',
  LOOP_START: 'loop_start',
  LOOP_EXIT: 'loop_exit',
  CONDITION: 'condition',
  SUB_WORKFLOW: 'sub_workflow',
} as const

export type BuiltinNodeType = (typeof BuiltinNodeType)[keyof typeof BuiltinNodeType]

/** 不支持 SINGLE_NODE 测试运行的内置节点类型（控制流 / 容器 / 系统节点） */
const SINGLE_NODE_TEST_RUN_UNSUPPORTED_TYPES: ReadonlySet<string> = new Set([
  BuiltinNodeType.START,
  BuiltinNodeType.END,
  BuiltinNodeType.LOOP,
  BuiltinNodeType.LOOP_START,
  BuiltinNodeType.LOOP_EXIT,
  BuiltinNodeType.SUB_WORKFLOW,
])

export function supportsSingleNodeTestRun(nodeType: string): boolean {
  return !SINGLE_NODE_TEST_RUN_UNSUPPORTED_TYPES.has(nodeType)
}
