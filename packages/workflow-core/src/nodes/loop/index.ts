import { createInitialConfig } from '../../node/create-initial-config'
import type { NodeType } from '../../node/node-definition'
import { loopNodeDefinition } from './definition'
import { loopNodeForm } from './form'
import { loopNodeSchema } from './schema'

export const loopNode = {
  schema: loopNodeSchema,
  definition: loopNodeDefinition,
  form: loopNodeForm,
  createInitialConfig: () => createInitialConfig(loopNodeSchema),
} satisfies NodeType<typeof loopNodeSchema>

export type { LoopNodeConfig } from './schema'
