import type { JsonValue, NodeOutputDefinition } from '@ai-workflow/core'

import { RUNTIME_ERROR_CODES, RuntimeError } from '../runtime/runtime-error'
import { hasOwn } from '../utils/has-own'
import { parseJsonValue } from '../utils/json-value'
import { matchesDataType } from '../utils/matches-data-type'

export interface NormalizeDeclaredValuesOptions {
  boundary: 'startInput' | 'nodeOutput'
  ownerId: string
  unknownValuePolicy: 'reject' | 'omit'
}

export function normalizeDeclaredValues(
  rawValues: Readonly<Record<string, unknown>>,
  definitions: readonly NodeOutputDefinition[],
  options: NormalizeDeclaredValuesOptions,
): Record<string, JsonValue> {
  const definitionByKey = new Map(definitions.map((definition) => [definition.key, definition]))
  const unknownKeys = Object.keys(rawValues).filter((key) => !definitionByKey.has(key))

  if (options.unknownValuePolicy === 'reject' && unknownKeys.length > 0) {
    throw new RuntimeError(
      options.boundary === 'startInput'
        ? RUNTIME_ERROR_CODES.INVALID_START_INPUT
        : RUNTIME_ERROR_CODES.INVALID_NODE_RESULT,
      '存在未声明的变量字段',
      { ownerId: options.ownerId, unknownKeys },
    )
  }

  const normalized: Record<string, JsonValue> = {}

  for (const definition of definitions) {
    let rawValue: unknown = undefined

    if (hasOwn(rawValues, definition.key)) {
      rawValue = rawValues[definition.key]
    } else if (definition.defaultValue !== undefined) {
      rawValue = definition.defaultValue
    } else if (definition.required === true) {
      throw new RuntimeError(
        options.boundary === 'startInput'
          ? RUNTIME_ERROR_CODES.INVALID_START_INPUT
          : RUNTIME_ERROR_CODES.INVALID_NODE_RESULT,
        `缺少必填变量：${definition.key}`,
        { ownerId: options.ownerId, key: definition.key },
      )
    } else {
      continue
    }

    const value = parseJsonValue(rawValue, `${options.boundary}.${definition.key}`)
    if (!matchesDataType(value, definition.dataType)) {
      throw new RuntimeError(
        RUNTIME_ERROR_CODES.VALUE_TYPE_MISMATCH,
        `变量 ${definition.key} 与声明类型不匹配`,
        {
          ownerId: options.ownerId,
          key: definition.key,
          expectedDataType: definition.dataType,
        },
      )
    }

    normalized[definition.key] = value
  }

  return normalized
}
