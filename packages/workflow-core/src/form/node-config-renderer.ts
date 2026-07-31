// 特点node config form面板渲染的组件
export const NODE_CONFIG_RENDERER_TYPES = {
  LLM: 'llm',
} as const

export type NodeConfigRendererType =
  | (typeof NODE_CONFIG_RENDERER_TYPES)[keyof typeof NODE_CONFIG_RENDERER_TYPES]
  | (string & {})
