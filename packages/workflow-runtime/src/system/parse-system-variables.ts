import {
  SYSTEM_VARIABLE_DEFINITIONS,
  SYSTEM_VARIABLE_KEYS,
  type JsonValue,
  type SystemVariableKey,
} from '@ai-workflow/core'

import { RUNTIME_ERROR_CODES, RuntimeError } from '../runtime/runtime-error'
import { hasOwn } from '../utils/has-own'
import { parseJsonValue } from '../utils/json-value'
import { matchesDataType } from '../utils/matches-data-type'

export interface SystemVariableIdentity {
  runId: string
  workflowId: string
}

export function parseSystemVariables(
  rawVariables: Record<SystemVariableKey, JsonValue>,
  identity: SystemVariableIdentity,
): Record<SystemVariableKey, JsonValue> {
  const expectedKeys = new Set(SYSTEM_VARIABLE_DEFINITIONS.map((definition) => definition.key))
  const actualKeys = Object.keys(rawVariables)

  const missingKeys = [...expectedKeys].filter((key) => !hasOwn(rawVariables, key))
  const unknownKeys = actualKeys.filter((key) => !expectedKeys.has(key as SystemVariableKey))

  if (missingKeys.length > 0 || unknownKeys.length > 0) {
    throw new RuntimeError(RUNTIME_ERROR_CODES.INVALID_SYSTEM_VARIABLES, '系统变量键集合不完整', {
      missingKeys,
      unknownKeys,
    })
  }

  const parsedVariables = {} as Record<SystemVariableKey, JsonValue>

  for (const definition of SYSTEM_VARIABLE_DEFINITIONS) {
    const value = parseJsonValue(rawVariables[definition.key], `system.${definition.key}`)
    if (!matchesDataType(value, definition.dataType)) {
      throw new RuntimeError(
        RUNTIME_ERROR_CODES.INVALID_SYSTEM_VARIABLES,
        `系统变量 ${definition.key} 类型不匹配`,
        { key: definition.key, expectedDataType: definition.dataType },
      )
    }

    parsedVariables[definition.key] = value
  }

  if (parsedVariables[SYSTEM_VARIABLE_KEYS.WORKFLOW_ID] !== identity.workflowId) {
    throw new RuntimeError(
      RUNTIME_ERROR_CODES.RUNTIME_IDENTITY_MISMATCH,
      '系统变量中的 workflow_id 与 Workflow 快照不一致',
    )
  }

  if (parsedVariables[SYSTEM_VARIABLE_KEYS.WORKFLOW_RUN_ID] !== identity.runId) {
    throw new RuntimeError(
      RUNTIME_ERROR_CODES.RUNTIME_IDENTITY_MISMATCH,
      '系统变量中的 workflow_run_id 与 Run 不一致',
    )
  }

  return parsedVariables
}
