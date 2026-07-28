import { createInitialConfig } from '../../node/create-initial-config'
import { NODE_VARIABLE_RENDERER_TYPES } from '../../form/node-variable-form'
import type { NodeType } from '../../node/node-definition'
import { endNodeDefinition } from './definition'
import { endNodeSchema } from './schema'

export const endNode = {
  schema: endNodeSchema,
  definition: endNodeDefinition,
  variableForm: {
    output: {
      label: '输出变量',
      renderer: NODE_VARIABLE_RENDERER_TYPES.INPUT_BINDINGS,
    },
  },
  createInitialConfig: () => createInitialConfig(endNodeSchema),
} satisfies NodeType<typeof endNodeSchema>

export type { EndNodeConfig } from './schema'
