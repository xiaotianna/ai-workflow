import { NODE_CONFIG_RENDERER_TYPES } from '@ai-workflow/core'
import type { NodeConfigRendererMap } from '@ai-workflow/form/components/node-config-section'

import { LlmNodeConfigEditor } from './llm'

export const builtinWorkflowNodeConfigRenderers = {
  [NODE_CONFIG_RENDERER_TYPES.LLM]: LlmNodeConfigEditor,
} satisfies NodeConfigRendererMap
