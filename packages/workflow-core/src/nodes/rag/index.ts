import { createInitialConfig } from '../../node/create-initial-config'
import type { NodeType } from '../../node/node-definition'
import { ragNodeDefinition } from './definition'
import { ragNodeForm } from './form'
import { ragNodeSchema } from './schema'

export { ragKnowledgeBaseIdsSchema, ragNodeSchema, ragTopKSchema } from './schema'

export const ragNode = {
  schema: ragNodeSchema,
  definition: ragNodeDefinition,
  form: ragNodeForm,
  createInitialConfig: () => createInitialConfig(ragNodeSchema),
} satisfies NodeType<typeof ragNodeSchema>

export type { RagNodeConfig } from './schema'
