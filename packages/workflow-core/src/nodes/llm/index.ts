import { createInitialConfig } from '../../node/create-initial-config'
import type { NodeType } from '../../node/node-definition'
import { llmNodeDefinition } from './definition'
import { llmNodeSchema } from './schema'

export const llmNode = {
  schema: llmNodeSchema,
  definition: llmNodeDefinition,
  createInitialConfig: () => createInitialConfig(llmNodeSchema),
} satisfies NodeType<typeof llmNodeSchema>

export type { LlmNodeConfig } from './schema'
