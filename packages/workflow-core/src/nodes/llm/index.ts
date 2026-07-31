import { createInitialConfig } from '../../node/create-initial-config'
import { NODE_CONFIG_RENDERER_TYPES } from '../../form/node-config-renderer'
import type { NodeType } from '../../node/node-definition'
import { llmNodeDefinition } from './definition'
import { llmNodeSchema } from './schema'

export {
  LLM_REASONING_EFFORT_VALUES,
  LLM_RESPONSE_FORMAT_VALUES,
  LLM_THINKING_MODE_VALUES,
  llmModelParametersSchema,
  llmModelSchema,
  llmNodeSchema,
} from './schema'

export const llmNode = {
  schema: llmNodeSchema,
  definition: llmNodeDefinition,
  configRenderer: NODE_CONFIG_RENDERER_TYPES.LLM,
  createInitialConfig: () => createInitialConfig(llmNodeSchema),
} satisfies NodeType<typeof llmNodeSchema>

export type {
  LlmModelConfig,
  LlmModelParameters,
  LlmModelParametersInput,
  LlmNodeConfig,
} from './schema'
