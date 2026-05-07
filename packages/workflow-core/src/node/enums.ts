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
  SCHEMA_EDITOR = 'schema-editor',
}

// 工作流数据类型枚举
export enum WorkflowDataTypeKind {
  STRING = 'string',
  NUMBER = 'number',
  BOOLEAN = 'boolean',
  JSON = 'json',
  CHAT_MESSAGE = 'chat-message',
  IMAGE = 'image',
  ARRAY = 'array',
  OBJECT = 'object',
  CUSTOM = 'custom',
}
