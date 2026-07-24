import { createInitialConfig } from '../../node/create-initial-config'
import type { NodeType } from '../../node/node-definition'
import { httpNodeDefinition } from './definition'
import { httpNodeSchema } from './schema'

export const httpNode = {
  schema: httpNodeSchema,
  definition: httpNodeDefinition,
  createInitialConfig: () => createInitialConfig(httpNodeSchema),
} satisfies NodeType<typeof httpNodeSchema>

export type { HttpNodeConfig } from './schema'

export * from './constant'
