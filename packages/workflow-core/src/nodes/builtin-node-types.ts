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
