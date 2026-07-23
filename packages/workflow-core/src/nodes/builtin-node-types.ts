export const BuiltinNodeType = {
  START: 'start',
  END: 'end',
  LLM: 'llm',
  RAG: 'rag',
  HTTP: 'http',
  LOOP: 'loop',
  CONDITION: 'condition',
  WORKFLOW: 'workflow',
} as const

export type BuiltinNodeType = (typeof BuiltinNodeType)[keyof typeof BuiltinNodeType]
