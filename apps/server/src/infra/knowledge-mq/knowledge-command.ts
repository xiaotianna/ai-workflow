export const KNOWLEDGE_COMMAND_TYPES = [
  'KNOWLEDGE_INDEX_BUILD_REQUESTED',
  'KNOWLEDGE_DOCUMENT_VERSION_PROCESS_REQUESTED',
  'KNOWLEDGE_DOCUMENT_PROJECTION_REQUESTED',
] as const

export type KnowledgeCommandType = (typeof KNOWLEDGE_COMMAND_TYPES)[number]

export interface KnowledgeCommand {
  schemaVersion: 1
  commandId: string
  type: KnowledgeCommandType
  aggregateId: string
}

export function parseKnowledgeCommand(value: unknown): KnowledgeCommand {
  if (!isRecord(value)) throw new Error('消息必须是对象')
  if (value.schemaVersion !== 1) throw new Error('不支持的 schemaVersion')
  if (!isUuid(value.commandId)) throw new Error('commandId 无效')
  if (!KNOWLEDGE_COMMAND_TYPES.includes(value.type as KnowledgeCommandType)) {
    throw new Error('不支持的知识库任务类型')
  }
  if (!isUuid(value.aggregateId)) throw new Error('aggregateId 无效')

  return {
    schemaVersion: 1,
    commandId: value.commandId,
    type: value.type as KnowledgeCommandType,
    aggregateId: value.aggregateId,
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function isUuid(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
  )
}
