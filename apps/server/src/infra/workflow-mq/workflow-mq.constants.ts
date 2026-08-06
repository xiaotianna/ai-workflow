export const WORKFLOW_COMMAND_EXCHANGE = 'ai-workflow.command.v1'
export const WORKFLOW_COMMAND_ROUTING_KEY = 'node.execute'
export const WORKFLOW_COMMAND_QUEUE = 'ai-workflow.node.execute.v1'

export const WORKFLOW_COMPUTE_COMMAND_ROUTING_KEY = 'node.execute.compute'
export const WORKFLOW_COMPUTE_COMMAND_QUEUE = 'ai-workflow.node.execute.compute.v1'
export const WORKFLOW_MODEL_COMMAND_ROUTING_KEY = 'node.execute.model'
export const WORKFLOW_MODEL_COMMAND_QUEUE = 'ai-workflow.node.execute.model.v1'
export const WORKFLOW_HTTP_COMMAND_ROUTING_KEY = 'node.execute.http'
export const WORKFLOW_HTTP_COMMAND_QUEUE = 'ai-workflow.node.execute.http.v1'
export const WORKFLOW_SANDBOX_COMMAND_ROUTING_KEY = 'node.execute.sandbox'
export const WORKFLOW_SANDBOX_COMMAND_QUEUE = 'ai-workflow.node.execute.sandbox.v1'

export const WORKFLOW_RESULT_EXCHANGE = 'ai-workflow.result.v1'
export const WORKFLOW_RESULT_ROUTING_KEY = 'node.result'
export const WORKFLOW_RESULT_QUEUE = 'ai-workflow.node.result.v1'
export const WORKFLOW_RESULT_RETRY_QUEUE = 'ai-workflow.node.result.retry.v1'

export const WORKFLOW_DEAD_LETTER_EXCHANGE = 'ai-workflow.dead-letter.v1'
export const WORKFLOW_COMMAND_DEAD_LETTER_ROUTING_KEY = 'node.execute.dead'
export const WORKFLOW_COMMAND_DEAD_LETTER_QUEUE = 'ai-workflow.node.execute.dlq.v1'
export const WORKFLOW_COMPUTE_COMMAND_DEAD_LETTER_ROUTING_KEY = 'node.execute.compute.dead'
export const WORKFLOW_COMPUTE_COMMAND_DEAD_LETTER_QUEUE = 'ai-workflow.node.execute.compute.dlq.v1'
export const WORKFLOW_MODEL_COMMAND_DEAD_LETTER_ROUTING_KEY = 'node.execute.model.dead'
export const WORKFLOW_MODEL_COMMAND_DEAD_LETTER_QUEUE = 'ai-workflow.node.execute.model.dlq.v1'
export const WORKFLOW_HTTP_COMMAND_DEAD_LETTER_ROUTING_KEY = 'node.execute.http.dead'
export const WORKFLOW_HTTP_COMMAND_DEAD_LETTER_QUEUE = 'ai-workflow.node.execute.http.dlq.v1'
export const WORKFLOW_SANDBOX_COMMAND_DEAD_LETTER_ROUTING_KEY = 'node.execute.sandbox.dead'
export const WORKFLOW_SANDBOX_COMMAND_DEAD_LETTER_QUEUE = 'ai-workflow.node.execute.sandbox.dlq.v1'
export const WORKFLOW_RESULT_DEAD_LETTER_ROUTING_KEY = 'node.result.dead'
export const WORKFLOW_RESULT_DEAD_LETTER_QUEUE = 'ai-workflow.node.result.dlq.v1'

export const WORKFLOW_COMMAND_ROUTES = [
  {
    routingKey: WORKFLOW_COMMAND_ROUTING_KEY,
    queue: WORKFLOW_COMMAND_QUEUE,
    deadLetterRoutingKey: WORKFLOW_COMMAND_DEAD_LETTER_ROUTING_KEY,
    deadLetterQueue: WORKFLOW_COMMAND_DEAD_LETTER_QUEUE,
  },
  {
    routingKey: WORKFLOW_COMPUTE_COMMAND_ROUTING_KEY,
    queue: WORKFLOW_COMPUTE_COMMAND_QUEUE,
    deadLetterRoutingKey: WORKFLOW_COMPUTE_COMMAND_DEAD_LETTER_ROUTING_KEY,
    deadLetterQueue: WORKFLOW_COMPUTE_COMMAND_DEAD_LETTER_QUEUE,
  },
  {
    routingKey: WORKFLOW_MODEL_COMMAND_ROUTING_KEY,
    queue: WORKFLOW_MODEL_COMMAND_QUEUE,
    deadLetterRoutingKey: WORKFLOW_MODEL_COMMAND_DEAD_LETTER_ROUTING_KEY,
    deadLetterQueue: WORKFLOW_MODEL_COMMAND_DEAD_LETTER_QUEUE,
  },
  {
    routingKey: WORKFLOW_HTTP_COMMAND_ROUTING_KEY,
    queue: WORKFLOW_HTTP_COMMAND_QUEUE,
    deadLetterRoutingKey: WORKFLOW_HTTP_COMMAND_DEAD_LETTER_ROUTING_KEY,
    deadLetterQueue: WORKFLOW_HTTP_COMMAND_DEAD_LETTER_QUEUE,
  },
  {
    routingKey: WORKFLOW_SANDBOX_COMMAND_ROUTING_KEY,
    queue: WORKFLOW_SANDBOX_COMMAND_QUEUE,
    deadLetterRoutingKey: WORKFLOW_SANDBOX_COMMAND_DEAD_LETTER_ROUTING_KEY,
    deadLetterQueue: WORKFLOW_SANDBOX_COMMAND_DEAD_LETTER_QUEUE,
  },
] as const

export const WORKFLOW_OUTBOX_BATCH_SIZE = 20
export const WORKFLOW_OUTBOX_CLAIM_TIMEOUT_MS = 30_000
export const WORKFLOW_OUTBOX_MAX_PUBLISH_ATTEMPTS = 10
export const WORKFLOW_OUTBOX_POLL_INTERVAL_MS = 250
export const WORKFLOW_RESULT_MAX_PROCESS_ATTEMPTS = 5
export const WORKFLOW_RESULT_PREFETCH = 20
export const WORKFLOW_MQ_RECONNECT_DELAY_MS = 2000
export const WORKFLOW_RESULT_RETRY_DELAY_MS = 1000
