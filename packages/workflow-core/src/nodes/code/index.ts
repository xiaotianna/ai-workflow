import { createInitialConfig } from '../../node/create-initial-config'
import type { NodeType } from '../../node/node-definition'
import { resolveErrorHandlingPorts } from '../../node/node-error-handling'
import { DATA_TYPE_KINDS } from '../../port/data-types'
import type { NodeInputBindings, NodeOutputDefinition } from '../../node/workflow-node-schema'
import { codeNodeDefinition } from './definition'
import { codeNodeForm } from './form'
import {
  CODE_NODE_DEFAULT_INPUT_KEYS,
  CODE_NODE_DEFAULT_OUTPUT_KEY,
  codeNodeSchema,
  createCodeNodeInitialCode,
} from './schema'

export { deriveCodeNodeOutputs, synchronizeCodeNodeOutputs } from './outputs'

function createCodeNodeInitialInputs(): NodeInputBindings {
  return Object.fromEntries(
    CODE_NODE_DEFAULT_INPUT_KEYS.map((key) => [
      key,
      {
        type: 'value' as const,
        value: '',
      },
    ]),
  )
}

function createCodeNodeInitialOutputs(): NodeOutputDefinition[] {
  return [
    {
      key: CODE_NODE_DEFAULT_OUTPUT_KEY,
      label: CODE_NODE_DEFAULT_OUTPUT_KEY,
      dataType: DATA_TYPE_KINDS.JSON,
    },
  ]
}

export const codeNode = {
  schema: codeNodeSchema,
  definition: codeNodeDefinition,
  form: codeNodeForm,
  createInitialInputs: createCodeNodeInitialInputs,
  createInitialOutputs: createCodeNodeInitialOutputs,
  createInitialConfig: (variables) => {
    const inputs = variables?.inputs ?? createCodeNodeInitialInputs()
    const outputs = variables?.outputs ?? createCodeNodeInitialOutputs()

    return createInitialConfig(codeNodeSchema, {
      code: createCodeNodeInitialCode(
        Object.keys(inputs),
        outputs[0]?.key ?? CODE_NODE_DEFAULT_OUTPUT_KEY,
      ),
    })
  },
  resolvePorts: (config) =>
    resolveErrorHandlingPorts(codeNodeDefinition.ports, config.errorHandling),
} satisfies NodeType<typeof codeNodeSchema>

export type { CodeNodeConfig } from './schema'
