// 工作流节点枚举
export enum WorkflowNodeType {
  START = 'start',
  END = 'end',
  BRANCH = 'branch',
  LOOP = 'loop',
  CODE = 'code',
  CHAT = 'chat',
  TOOL = 'tool',
  HTTP = 'http',
  RAG = 'rag',
}

// 工作流表单字段UI枚举
export enum WorkflowFieldUIType {
  INPUT = 'input',
  TEXTAREA = 'textarea',
  SELECT = 'select',
  SWITCH = 'switch',
  SLIDER = 'slider',
  CODE_EDITOR = 'code_editor',
}
