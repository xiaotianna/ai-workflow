import { NODE_VARIABLE_RENDERER_TYPES } from '@ai-workflow/core'

import type { NodeVariableRendererMap } from '../components/node-variable-section'
import { NodeInputBindingsEditor } from './node-input-bindings-editor'
import { NodeOutputDefinitionsEditor } from './node-output-definitions-editor'
import { StartInputVariablesEditor } from './start-input-variables-editor'

export const builtinNodeVariableRenderers: NodeVariableRendererMap = {
  [NODE_VARIABLE_RENDERER_TYPES.INPUT_BINDINGS]: NodeInputBindingsEditor,
  [NODE_VARIABLE_RENDERER_TYPES.OUTPUT_DEFINITIONS]: NodeOutputDefinitionsEditor,
  [NODE_VARIABLE_RENDERER_TYPES.START_INPUT_VARIABLES]: StartInputVariablesEditor,
}
