import { FIELD_UI_TYPES } from '@ai-workflow/core'
import type { NodeConfigFieldRendererMap } from '@ai-workflow/form/components/node-config-fields'

import { LlmModelField } from './llm-model-field'

export const builtinWorkflowNodeConfigFieldRenderers = {
  [FIELD_UI_TYPES.LLM_MODEL]: LlmModelField,
} satisfies NodeConfigFieldRendererMap
