import { createInitialConfig } from '../../node/create-initial-config'
import type { NodeType } from '../../node/node-definition'
import { startNodeDefinition } from './definition'
import { startNodeSchema } from './schema'

export const startNode = {
  schema: startNodeSchema,
  definition: startNodeDefinition,
  createInitialConfig: () => createInitialConfig(startNodeSchema),
} satisfies NodeType<typeof startNodeSchema>

export type { StartNodeConfig } from './schema'
