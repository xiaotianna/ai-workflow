import { createInitialConfig } from '../../node/create-initial-config'
import { NODE_VARIABLE_RENDERER_TYPES } from '../../form/node-variable-form'
import type { NodeType } from '../../node/node-definition'
import { startNodeDefinition } from './definition'
import { startNodeSchema } from './schema'

export const startNode = {
  schema: startNodeSchema,
  definition: startNodeDefinition,
  variableForm: {
    input: {
      label: '输入变量',
      renderer: NODE_VARIABLE_RENDERER_TYPES.START_INPUT_VARIABLES,
    },
  },
  createInitialConfig: () => createInitialConfig(startNodeSchema),
} satisfies NodeType<typeof startNodeSchema>

export type { StartNodeConfig } from './schema'
