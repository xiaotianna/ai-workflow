import { chatNodeDefinition } from './node-definition'
import { chatNodeSchema } from './node-schema'
import type { NodeType } from '../../types/node'
import { z } from 'zod'

export const chatNode: NodeType<typeof chatNodeSchema> = {
  schema: chatNodeSchema,
  definition: chatNodeDefinition,
}

export type ChatNodeData = z.infer<typeof chatNodeSchema>
