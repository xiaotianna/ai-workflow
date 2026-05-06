import { startNodeDefinition } from './node-definition'
import { startNodeSchema } from './node-schema'
import type { NodeType } from '../../types/node'
import { z } from 'zod'

export const startNode: NodeType<typeof startNodeSchema> = {
  schema: startNodeSchema,
  definition: startNodeDefinition,
}

export type StartNodeData = z.infer<typeof startNodeSchema>
