import { BuiltinNodeType } from '@ai-workflow/core'

export const NODE_THEMES = {
  [BuiltinNodeType.START]: '#4f6ef7',
  [BuiltinNodeType.END]: '#ff6b5e',
  [BuiltinNodeType.LLM]: '#a855f7',
  [BuiltinNodeType.RAG]: '#34c995',
  [BuiltinNodeType.CODE]: '#7c5cfc',
  [BuiltinNodeType.HTTP]: '#22b8cf',
  [BuiltinNodeType.LOOP]: '#14b8a6',
  [BuiltinNodeType.LOOP_START]: '#2dd4bf',
  [BuiltinNodeType.LOOP_EXIT]: '#f472b6',
  [BuiltinNodeType.CONDITION]: '#f5a524',
  [BuiltinNodeType.SUB_WORKFLOW]: '#ec4899',
  unknown: '#94a3b8',
} satisfies Record<BuiltinNodeType | 'unknown', string>

type NodeThemeName = keyof typeof NODE_THEMES

export function getNodeThemeColor(nodeType?: string) {
  if (!nodeType) return NODE_THEMES.unknown
  return NODE_THEMES[nodeType as NodeThemeName] ?? NODE_THEMES.unknown
}
