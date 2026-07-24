import { createInitialConfig } from '../../node/create-initial-config'
import type { NodeType } from '../../node/node-definition'
import { ragNodeDefinition } from './definition'
import { ragNodeSchema } from './schema'

export const ragNode = {
  schema: ragNodeSchema,
  definition: ragNodeDefinition,
  createInitialConfig: () => createInitialConfig(ragNodeSchema),
} satisfies NodeType<typeof ragNodeSchema>

export type { RagNodeConfig } from './schema'
