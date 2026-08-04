import { createInitialConfig } from '../../node/create-initial-config'
import type { NodeType } from '../../node/node-definition'
import { LOOP_FIXED_OUTPUTS, loopNodeDefinition } from './definition'
import { loopNodeForm } from './form'
import { loopNodeSchema } from './schema'

export const loopNode = {
  schema: loopNodeSchema,
  definition: loopNodeDefinition,
  fixedOutputs: LOOP_FIXED_OUTPUTS,
  form: loopNodeForm,
  createInitialConfig: () => createInitialConfig(loopNodeSchema),
  createInitialOutputs: () => LOOP_FIXED_OUTPUTS.map((output) => ({ ...output })),
} satisfies NodeType<typeof loopNodeSchema>

export type { LoopNodeConfig } from './schema'
export { loopNodeSchema } from './schema'
export { LOOP_FIXED_OUTPUTS } from './definition'
