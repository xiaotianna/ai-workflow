import { createInitialConfig } from '../../node/create-initial-config'
import type { NodeType } from '../../node/node-definition'
import { loopStartNodeDefinition } from './definition'
import { loopStartNodeSchema } from './schema'

export const loopStartNode = {
  schema: loopStartNodeSchema,
  definition: loopStartNodeDefinition,
  createInitialConfig: () => createInitialConfig(loopStartNodeSchema)
} satisfies NodeType<typeof loopStartNodeSchema>
