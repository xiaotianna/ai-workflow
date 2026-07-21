export const BuiltinNodeType = {
  START: 'start',
  // END: 'end',
  // LLM: 'llm',
  // HTTP: 'http',
  CONDITION: 'condition',
} as const

export type BuiltinNodeType = (typeof BuiltinNodeType)[keyof typeof BuiltinNodeType]
