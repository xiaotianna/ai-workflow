export const WORKFLOW_COMMAND_EXCHANGE = 'ai-workflow.command.v1'
export const WORKFLOW_COMMAND_ROUTING_KEY = 'node.execute'
export const WORKFLOW_COMMAND_QUEUE = 'ai-workflow.node.execute.v1'

export const WORKFLOW_RESULT_EXCHANGE = 'ai-workflow.result.v1'
export const WORKFLOW_RESULT_ROUTING_KEY = 'node.result'
export const WORKFLOW_RESULT_QUEUE = 'ai-workflow.node.result.v1'
export const WORKFLOW_RESULT_RETRY_QUEUE = 'ai-workflow.node.result.retry.v1'

export const WORKFLOW_DEAD_LETTER_EXCHANGE = 'ai-workflow.dead-letter.v1'
export const WORKFLOW_COMMAND_DEAD_LETTER_ROUTING_KEY = 'node.execute.dead'
export const WORKFLOW_COMMAND_DEAD_LETTER_QUEUE = 'ai-workflow.node.execute.dlq.v1'
export const WORKFLOW_RESULT_DEAD_LETTER_ROUTING_KEY = 'node.result.dead'
export const WORKFLOW_RESULT_DEAD_LETTER_QUEUE = 'ai-workflow.node.result.dlq.v1'

export const WORKFLOW_OUTBOX_BATCH_SIZE = 20
export const WORKFLOW_OUTBOX_CLAIM_TIMEOUT_MS = 30_000
export const WORKFLOW_OUTBOX_MAX_PUBLISH_ATTEMPTS = 10
export const WORKFLOW_OUTBOX_POLL_INTERVAL_MS = 250
export const WORKFLOW_RESULT_MAX_PROCESS_ATTEMPTS = 5
export const WORKFLOW_RESULT_PREFETCH = 20
export const WORKFLOW_MQ_RECONNECT_DELAY_MS = 2000
export const WORKFLOW_RESULT_RETRY_DELAY_MS = 1000
