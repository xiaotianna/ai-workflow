import {
  httpNodeSchema,
  type HttpKeyValueEntry,
  type HttpRequestBody,
  type JsonValue,
  type VariableValue,
} from '@ai-workflow/core'

import { RUNTIME_ERROR_CODES, RuntimeError } from '../runtime/runtime-error'
import { parseJsonObject } from '../utils/json-value'
import type { RuntimeNodeConfigProjector } from './runtime-node-config-resolver'

type ResolveValue = (value: VariableValue) => JsonValue

function projectEntry(entry: HttpKeyValueEntry, resolveValue: ResolveValue) {
  return {
    id: entry.id,
    key: resolveValue(entry.key),
    value: resolveValue(entry.value),
  }
}

function projectBody(body: HttpRequestBody, resolveValue: ResolveValue): JsonValue {
  if (body.type === 'form-data') {
    return {
      type: body.type,
      entries: body.entries.map((entry) => ({
        ...projectEntry(entry, resolveValue),
        valueType: entry.valueType,
      })),
    }
  }

  if (body.type === 'x-www-form-urlencoded') {
    return {
      type: body.type,
      entries: body.entries.map((entry) => projectEntry(entry, resolveValue)),
    }
  }

  if (body.type === 'json' || body.type === 'raw' || body.type === 'binary') {
    return {
      type: body.type,
      value: resolveValue(body.value),
    }
  }

  return { type: 'none' }
}

export const projectHttpNodeConfig: RuntimeNodeConfigProjector = (node, context) => {
  const parsed = httpNodeSchema.safeParse(node.config)
  if (!parsed.success) {
    throw new RuntimeError(
      RUNTIME_ERROR_CODES.UNSUPPORTED_NODE_CONFIG,
      `HTTP 节点 ${node.id} 的配置无效`,
      {
        nodeId: node.id,
        issues: parsed.error.issues.map((issue) => issue.message),
      },
    )
  }

  return parseJsonObject(
    {
      ...parsed.data,
      headers: parsed.data.headers.map((entry) => projectEntry(entry, context.resolveValue)),
      params: parsed.data.params.map((entry) => projectEntry(entry, context.resolveValue)),
      body: projectBody(parsed.data.body, context.resolveValue),
    },
    `node.${node.id}.resolvedConfig`,
  )
}
