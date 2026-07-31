import { NODE_CONFIG_RENDERER_TYPES } from '@ai-workflow/core'

import type { NodeConfigRendererMap } from '../components/node-config-section'
import { ConditionConfigEditor } from './condition-config-editor'

export const builtinNodeConfigRenderers: NodeConfigRendererMap = {
  [NODE_CONFIG_RENDERER_TYPES.CONDITION]: ConditionConfigEditor,
}
