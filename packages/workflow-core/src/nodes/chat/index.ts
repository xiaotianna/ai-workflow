import { NodeType } from '../../node/node-type'
import { chatNodeDefinition } from './node-definition'
import { chatNodeSchema } from './node-schema'
import { z } from 'zod'

export const chatNode: NodeType<typeof chatNodeSchema> = {
  schema: chatNodeSchema,
  definition: chatNodeDefinition,
}

// 给nodes-ui使用的
export type ChatNodeData = z.infer<typeof chatNodeSchema>
