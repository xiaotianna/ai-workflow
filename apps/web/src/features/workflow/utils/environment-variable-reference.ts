import { ENVIRONMENT_VARIABLE_NAMESPACE, type WorkflowNode } from '@ai-workflow/core'

function containsEnvironmentVariableReference(
  value: unknown,
  variableId: string,
  visited: WeakSet<object>,
): boolean {
  if (typeof value === 'string') {
    return value.includes(`{{#${ENVIRONMENT_VARIABLE_NAMESPACE}.${variableId}`)
  }

  if (typeof value !== 'object' || value === null) return false
  if (visited.has(value)) return false

  visited.add(value)

  if (
    !Array.isArray(value) &&
    'scope' in value &&
    value.scope === ENVIRONMENT_VARIABLE_NAMESPACE &&
    'variableId' in value &&
    value.variableId === variableId
  ) {
    return true
  }

  return Object.values(value).some((nestedValue) =>
    containsEnvironmentVariableReference(nestedValue, variableId, visited),
  )
}

export function isEnvironmentVariableReferenced(
  variableId: string,
  nodes: readonly WorkflowNode[],
) {
  return nodes.some((node) => containsEnvironmentVariableReference(node, variableId, new WeakSet()))
}
