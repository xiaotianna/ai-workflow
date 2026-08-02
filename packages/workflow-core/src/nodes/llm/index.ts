import { createInitialConfig } from '../../node/create-initial-config'
import type { NodeType } from '../../node/node-definition'
import { resolveErrorHandlingPorts } from '../../node/node-error-handling'
import { llmNodeDefinition } from './definition'
import { llmNodeForm } from './form'
import { llmNodeSchema } from './schema'

export {
  LLM_CONTEXT_MESSAGE_ROLE_VALUES,
  LLM_REASONING_EFFORT_VALUES,
  LLM_RESPONSE_FORMAT_VALUES,
  LLM_THINKING_MODE_VALUES,
  llmContextMessageSchema,
  llmContextMessagesSchema,
  llmModelParametersSchema,
  llmModelSchema,
  llmNodeSchema,
} from './schema'

export const llmNode = {
  schema: llmNodeSchema,
  definition: llmNodeDefinition,
  form: llmNodeForm,
  createInitialConfig: () => createInitialConfig(llmNodeSchema),
  resolvePorts: (config) =>
    resolveErrorHandlingPorts(llmNodeDefinition.ports, config.errorHandling),
} satisfies NodeType<typeof llmNodeSchema>

export type {
  LlmContextMessage,
  LlmContextMessageInput,
  LlmContextMessageRole,
  LlmModelConfig,
  LlmModelParameters,
  LlmModelParametersInput,
  LlmNodeConfig,
} from './schema'
