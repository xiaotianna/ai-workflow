import { createInitialConfig } from '../../node/create-initial-config'
import type { NodeType } from '../../node/node-definition'
import { LOOP_START_FIXED_OUTPUTS, loopStartNodeDefinition } from './definition'
import { loopStartNodeSchema } from './schema'

export const loopStartNode = {
  schema: loopStartNodeSchema,
  definition: loopStartNodeDefinition,
  fixedOutputs: LOOP_START_FIXED_OUTPUTS,
  createInitialConfig: () => createInitialConfig(loopStartNodeSchema),
  createInitialOutputs: () => LOOP_START_FIXED_OUTPUTS.map((output) => ({ ...output })),
} satisfies NodeType<typeof loopStartNodeSchema>

export { LOOP_START_FIXED_OUTPUTS } from './definition'
