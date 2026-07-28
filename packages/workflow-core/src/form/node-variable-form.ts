// 配置面板输入、输出渲染组件类型
export const NODE_VARIABLE_RENDERER_TYPES = {
  INPUT_BINDINGS: 'input_bindings',
  OUTPUT_DEFINITIONS: 'output_definitions',
  START_INPUT_VARIABLES: 'start_input_variables',
} as const

export type NodeVariableRendererType =
  | (typeof NODE_VARIABLE_RENDERER_TYPES)[keyof typeof NODE_VARIABLE_RENDERER_TYPES]
  | (string & {})

export interface NodeVariableFormSection {
  label: string
  description?: string
  renderer: NodeVariableRendererType
}

export interface NodeVariableForm {
  input?: NodeVariableFormSection
  output?: NodeVariableFormSection
}

export const DEFAULT_NODE_VARIABLE_FORM = {
  input: {
    label: '输入变量',
    renderer: NODE_VARIABLE_RENDERER_TYPES.INPUT_BINDINGS,
  },
  output: {
    label: '输出变量',
    renderer: NODE_VARIABLE_RENDERER_TYPES.OUTPUT_DEFINITIONS,
  },
} as const satisfies NodeVariableForm

export function resolveNodeVariableForm(variableForm?: NodeVariableForm): NodeVariableForm {
  return variableForm ?? DEFAULT_NODE_VARIABLE_FORM
}
