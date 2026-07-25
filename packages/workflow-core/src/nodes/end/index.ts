import { createInitialConfig } from '../../node/create-initial-config'
import type { NodeType } from '../../node/node-definition'
import { endNodeDefinition } from './definition'
import { endNodeSchema } from './schema'

export const endNode = {
  schema: endNodeSchema,
  definition: endNodeDefinition,
  createInitialConfig: () => createInitialConfig(endNodeSchema),
} satisfies NodeType<typeof endNodeSchema>

export type { EndNodeConfig } from './schema'
