import { createInitialConfig } from '../../node/create-initial-config'
import { NodeType } from '../../node/node-definition'
import { startNodeDefinition } from './definition'
import { startNodeSchema } from './schema'

export const startNode = {
  schema: startNodeSchema,
  definition: startNodeDefinition,
  createInitialConfig: () => createInitialConfig(startNodeSchema),
} satisfies NodeType<typeof startNodeSchema>

export { StartNodeConfig } from './schema'
