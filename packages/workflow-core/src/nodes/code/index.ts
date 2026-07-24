import { createInitialConfig } from '../../node/create-initial-config'
import type { NodeType } from '../../node/node-definition'
import { codeNodeDefinition } from './definition'
import { codeNodeSchema } from './schema'

export const codeNode = {
  schema: codeNodeSchema,
  definition: codeNodeDefinition,
  createInitialConfig: () => createInitialConfig(codeNodeSchema)
} satisfies NodeType<typeof codeNodeSchema>

export type { CodeNodeConfig } from './schema'
