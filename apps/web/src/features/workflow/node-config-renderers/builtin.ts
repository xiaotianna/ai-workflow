import { FIELD_UI_TYPES } from '@ai-workflow/core'
import type { NodeConfigFieldRendererMap } from '@ai-workflow/form/components/node-config-fields'
import type { NodeConfigRendererMap } from '@ai-workflow/form/components/node-config-section'

import { LlmModelField } from './llm-model-field'

export const builtinWorkflowNodeConfigFieldRenderers = {
  [FIELD_UI_TYPES.LLM_MODEL]: LlmModelField,
} satisfies NodeConfigFieldRendererMap

export const builtinWorkflowNodeConfigRenderers: NodeConfigRendererMap = {}
