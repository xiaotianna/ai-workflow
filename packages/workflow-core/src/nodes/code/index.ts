import { createInitialConfig } from '../../node/create-initial-config'
import type { NodeType } from '../../node/node-definition'
import { codeNodeDefinition } from './definition'
import { codeNodeForm } from './form'
import { codeNodeSchema } from './schema'

export const codeNode = {
  schema: codeNodeSchema,
  definition: codeNodeDefinition,
  form: codeNodeForm,
  createInitialConfig: () => createInitialConfig(codeNodeSchema),
} satisfies NodeType<typeof codeNodeSchema>

export type { CodeNodeConfig } from './schema'
