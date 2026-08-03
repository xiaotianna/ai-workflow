import {
  ENVIRONMENT_VARIABLE_NAMESPACE,
  ENVIRONMENT_VARIABLE_TYPES,
  SYSTEM_VARIABLE_NAMESPACE,
  type JsonValue,
  type SystemVariableKey,
  type Workflow,
} from '@ai-workflow/core'

export function createRuntimeContextInputs(
  workflow: Workflow,
  systemVariables: Record<SystemVariableKey, JsonValue>,
): Record<string, JsonValue> {
  const environmentInputs = Object.fromEntries(
    workflow.environmentVariables.flatMap((variable) =>
      variable.type === ENVIRONMENT_VARIABLE_TYPES.SECRET
        ? []
        : [[`${ENVIRONMENT_VARIABLE_NAMESPACE}.${variable.name}`, variable.value]],
    ),
  )
  const systemInputs = Object.fromEntries(
    Object.entries(systemVariables).map(([key, value]) => [
      `${SYSTEM_VARIABLE_NAMESPACE}.${key}`,
      value,
    ]),
  )

  return {
    ...environmentInputs,
    ...systemInputs,
  }
}
