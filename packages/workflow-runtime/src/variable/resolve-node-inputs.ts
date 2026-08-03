import type { JsonValue, WorkflowNode } from '@ai-workflow/core'

import { createRuntimeContextInputs } from '../input/create-runtime-context-inputs'
import { resolveVariableValue, type VariableResolutionContext } from './resolve-variable-value'

export function resolveNodeInputs(
  node: WorkflowNode,
  context: VariableResolutionContext,
): Record<string, JsonValue> {
  const declaredInputs = Object.fromEntries(
    Object.entries(node.inputs).map(([key, value]) => [key, resolveVariableValue(value, context)]),
  )

  return {
    ...declaredInputs,
    ...createRuntimeContextInputs(context.workflow, context.state.systemVariables),
  }
}
