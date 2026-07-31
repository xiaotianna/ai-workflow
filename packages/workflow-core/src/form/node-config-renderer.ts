// 内置节点当前均使用字段级 form；该注册表保留给后续无法拆分的完整配置表单。
export const NODE_CONFIG_RENDERER_TYPES = {} as const

export type NodeConfigRendererType =
  | (typeof NODE_CONFIG_RENDERER_TYPES)[keyof typeof NODE_CONFIG_RENDERER_TYPES]
  | (string & {})
