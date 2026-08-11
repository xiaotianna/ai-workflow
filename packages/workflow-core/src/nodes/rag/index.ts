import { createInitialConfig } from '../../node/create-initial-config'
import type { NodeType } from '../../node/node-definition'
import { NODE_VARIABLE_RENDERER_TYPES } from '../../form/node-variable-form'
import { ragNodeDefinition } from './definition'
import { ragNodeForm } from './form'
import { RAG_FIXED_OUTPUTS } from './outputs'
import { ragNodeSchema } from './schema'

export {
  ragKnowledgeBaseIdsSchema,
  ragKnowledgeBaseReferenceSchema,
  ragKnowledgeBaseReferencesSchema,
  ragNodeSchema,
  ragQuerySchema,
  ragTopKSchema,
} from './schema'

export const ragNode = {
  schema: ragNodeSchema,
  definition: ragNodeDefinition,
  form: ragNodeForm,
  variableForm: {
    output: {
      label: '输出变量',
      renderer: NODE_VARIABLE_RENDERER_TYPES.OUTPUT_DEFINITIONS,
    },
  },
  fixedOutputs: RAG_FIXED_OUTPUTS,
  createInitialConfig: () => createInitialConfig(ragNodeSchema),
  createInitialOutputs: () => RAG_FIXED_OUTPUTS.map((output) => ({ ...output })),
} satisfies NodeType<typeof ragNodeSchema>

export type { RagKnowledgeBaseReference, RagNodeConfig } from './schema'
export * from './outputs'
