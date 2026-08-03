import type { JsonValue, WorkflowNode } from '@ai-workflow/core'

import { resolveVariableValue, type VariableResolutionContext } from './resolve-variable-value'

export function resolveNodeInputs(
  node: WorkflowNode,
  context: VariableResolutionContext,
): Record<string, JsonValue> {
  return Object.fromEntries(
    Object.entries(node.inputs).map(([key, value]) => [key, resolveVariableValue(value, context)]),
  )
}
