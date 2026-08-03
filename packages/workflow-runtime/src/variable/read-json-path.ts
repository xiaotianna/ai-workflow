import type { JsonValue } from '@ai-workflow/core'

import { RUNTIME_ERROR_CODES, RuntimeError } from '../runtime/runtime-error'
import { hasOwn } from '../utils/has-own'

function readArrayIndex(value: JsonValue[], segment: string): JsonValue | undefined {
  if (!/^(0|[1-9]\d*)$/.test(segment)) {
    return undefined
  }

  const index = Number(segment)
  return index < value.length ? value[index] : undefined
}

export function readJsonPath(
  root: JsonValue,
  path: readonly string[],
  referenceLabel: string,
): JsonValue {
  let current = root

  for (const segment of path) {
    let next: JsonValue | undefined = undefined

    if (Array.isArray(current)) {
      next = readArrayIndex(current, segment)
    } else if (current !== null && typeof current === 'object' && hasOwn(current, segment)) {
      next = current[segment]
    }

    if (next === undefined) {
      throw new RuntimeError(
        RUNTIME_ERROR_CODES.VARIABLE_PATH_NOT_FOUND,
        `变量路径不存在：${referenceLabel}.${path.join('.')}`,
        { referenceLabel, path: [...path], missingSegment: segment },
      )
    }

    current = next
  }

  return current
}
