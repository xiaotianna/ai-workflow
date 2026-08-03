import { jsonValueSchema, type JsonValue } from '@ai-workflow/core'

import { RUNTIME_ERROR_CODES, RuntimeError } from '../runtime/runtime-error'

// 把unknown数据转为JsonValue
export function parseJsonValue(value: unknown, field: string): JsonValue {
  const parsed = jsonValueSchema.safeParse(value)
  if (!parsed.success) {
    throw new RuntimeError(RUNTIME_ERROR_CODES.VALUE_NOT_JSON, `${field} 不是合法 JSON 值`, {
      field,
      issues: parsed.error.issues.map((issue) => issue.message),
    })
  }

  return parsed.data
}

// 把unknown数据转为JSON Object
export function parseJsonObject(value: unknown, field: string): Record<string, JsonValue> {
  const parsed = parseJsonValue(value, field)
  if (parsed === null || Array.isArray(parsed) || typeof parsed !== 'object') {
    throw new RuntimeError(RUNTIME_ERROR_CODES.VALUE_NOT_JSON, `${field} 必须是 JSON 对象`, {
      field,
    })
  }

  return parsed
}
