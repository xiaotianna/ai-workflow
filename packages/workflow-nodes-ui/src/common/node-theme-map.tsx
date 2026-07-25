import { BuiltinNodeType } from '@ai-workflow/core'

export const NODE_THEMES = {
  [BuiltinNodeType.START]: '#085afc',
  [BuiltinNodeType.END]: '#f79009',
  [BuiltinNodeType.LLM]: '#C29BDC',
  [BuiltinNodeType.RAG]: '#B9E6C7',
  [BuiltinNodeType.HTTP]: '',
  [BuiltinNodeType.LOOP]: '',
  [BuiltinNodeType.CONDITION]: '',
  [BuiltinNodeType.SUB_WORKFLOW]: '',
  unknown: '',
} satisfies Record<string, string>
