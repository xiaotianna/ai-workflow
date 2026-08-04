import { createInitialConfig } from '../../node/create-initial-config'
import type { NodeType } from '../../node/node-definition'
import { resolveErrorHandlingPorts } from '../../node/node-error-handling'
import { httpNodeDefinition } from './definition'
import { httpNodeForm } from './form'
import { HTTP_FIXED_OUTPUTS } from './outputs'
import { httpNodeSchema } from './schema'

export const httpNode = {
  schema: httpNodeSchema,
  definition: httpNodeDefinition,
  form: httpNodeForm,
  fixedOutputs: HTTP_FIXED_OUTPUTS,
  createInitialConfig: () => createInitialConfig(httpNodeSchema),
  createInitialOutputs: () => HTTP_FIXED_OUTPUTS.map((output) => ({ ...output })),
  resolvePorts: (config) =>
    resolveErrorHandlingPorts(httpNodeDefinition.ports, config.errorHandling),
} satisfies NodeType<typeof httpNodeSchema>

export * from './constant'
export * from './outputs'
export * from './schema'
