import {
  ENVIRONMENT_VARIABLE_NAMESPACE,
  SYSTEM_VARIABLE_NAMESPACE,
  llmNodeSchema,
  variableReferenceSchema,
  type JsonValue,
  type VariableReference,
} from '@ai-workflow/core'

import { RUNTIME_ERROR_CODES, RuntimeError } from '../runtime/runtime-error'
import { parseJsonObject } from '../utils/json-value'
import type { RuntimeNodeConfigProjector } from './runtime-node-config-resolver'

const VARIABLE_TOKEN_PATTERN = /\{\{#([^{}]+)#\}\}/g

function parseVariableReference(nodeId: string, token: string): VariableReference {
  const segments = token.split('.')
  const [namespace, key, ...path] = segments
  const reference: unknown =
    namespace === SYSTEM_VARIABLE_NAMESPACE
      ? { scope: 'system', key, path }
      : namespace === ENVIRONMENT_VARIABLE_NAMESPACE
        ? { scope: ENVIRONMENT_VARIABLE_NAMESPACE, variableId: key, path }
        : {
            scope: 'node',
            nodeId: namespace,
            outputKey: key,
            path,
          }

  const parsed = variableReferenceSchema.safeParse(reference)
  if (!parsed.success) {
    throw new RuntimeError(
      RUNTIME_ERROR_CODES.UNSUPPORTED_NODE_CONFIG,
      `LLM 节点 ${nodeId} 的上下文变量格式无效`,
      { nodeId, token },
    )
  }

  return parsed.data
}

function stringifyContextValue(value: JsonValue): string {
  return typeof value === 'string' ? value : JSON.stringify(value)
}

export const projectLlmNodeConfig: RuntimeNodeConfigProjector = (node, context) => {
  const parsed = llmNodeSchema.safeParse(node.config)
  if (!parsed.success) {
    throw new RuntimeError(
      RUNTIME_ERROR_CODES.UNSUPPORTED_NODE_CONFIG,
      `LLM 节点 ${node.id} 的配置无效`,
      {
        nodeId: node.id,
        issues: parsed.error.issues.map((issue) => issue.message),
      },
    )
  }

  const messages = parsed.data.messages.map((message) => ({
    ...message,
    content: message.content.replace(VARIABLE_TOKEN_PATTERN, (_match, token: string) => {
      const reference = parseVariableReference(node.id, token)
      return stringifyContextValue(
        context.resolveValue({
          type: 'reference',
          reference,
        }),
      )
    }),
  }))

  return parseJsonObject(
    {
      ...parsed.data,
      messages,
    },
    `node.${node.id}.resolvedConfig`,
  )
}
