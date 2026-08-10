export const KNOWLEDGE_COMMAND_EXCHANGE = 'ai-workflow.knowledge.command.v1'
export const KNOWLEDGE_COMMAND_ROUTING_KEY = 'knowledge.command'
export const KNOWLEDGE_COMMAND_QUEUE = 'ai-workflow.knowledge.command.v1'
export const KNOWLEDGE_COMMAND_RETRY_QUEUE = 'ai-workflow.knowledge.command.retry.v1'

export const KNOWLEDGE_DEAD_LETTER_EXCHANGE = 'ai-workflow.knowledge.dead-letter.v1'
export const KNOWLEDGE_COMMAND_DEAD_LETTER_ROUTING_KEY = 'knowledge.command.dead'
export const KNOWLEDGE_COMMAND_DEAD_LETTER_QUEUE = 'ai-workflow.knowledge.command.dlq.v1'

export const KNOWLEDGE_OUTBOX_BATCH_SIZE = 20
export const KNOWLEDGE_OUTBOX_CLAIM_TIMEOUT_MS = 30_000
export const KNOWLEDGE_OUTBOX_MAX_PUBLISH_ATTEMPTS = 10
export const KNOWLEDGE_OUTBOX_POLL_INTERVAL_MS = 500
export const KNOWLEDGE_COMMAND_MAX_PROCESS_ATTEMPTS = 5
export const KNOWLEDGE_COMMAND_PREFETCH = 5
export const KNOWLEDGE_COMMAND_RETRY_DELAY_MS = 2000
