import { createInitialConfig } from '../../node/create-initial-config'
import type { NodeType } from '../../node/node-definition'
import { loopExitNodeDefinition } from './definition'
import { loopExitNodeSchema } from './schema'

export const loopExitNode = {
  schema: loopExitNodeSchema,
  definition: loopExitNodeDefinition,
  createInitialConfig: () => createInitialConfig(loopExitNodeSchema)
} satisfies NodeType<typeof loopExitNodeSchema>

export type { LoopExitNodeConfig } from './schema'
